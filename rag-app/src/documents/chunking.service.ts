import { Injectable } from '@nestjs/common';
import { BoundingBox } from '../vector-store/interfaces/vector-store.interface.js';
import { Chunk, ExtractedImage } from './interfaces/chunk.interface.js';
import {
  ElementCoordinates,
  UnstructuredElement,
} from './extraction/unstructured-element.interface.js';

const MAX_CHUNK_CHARS = 1500;
/** Las imágenes más pequeñas que esta fracción de la página (logos, íconos) se descartan. */
const MIN_IMAGE_AREA = 0.05;
const DISCARDED_TYPES = new Set(['Header', 'Footer', 'PageNumber']);
/**
 * Franja superior e inferior de la página donde el texto se considera
 * encabezado o pie aunque Unstructured no lo clasifique como tal.
 */
const PAGE_MARGIN = 0.05;
/** Posición desconocida: el elemento no trae coordenadas. */
const FULL_PAGE: BoundingBox = { x1: 0, y1: 0, x2: 1, y2: 1 };
/** Distancia máxima entre posiciones para considerar que un texto se repite en el mismo lugar. */
const REPEAT_TOLERANCE = 0.02;
/** Pie de figura, detectado por su texto porque Unstructured le asigna tipos distintos. */
const CAPTION_PATTERN = /^(figura|fig\.|figure|gr[áa]fic[oa]|imagen)\s*\d+/i;
/** Máximo de caracteres del texto de un chunk de figura (pie más OCR). */
const MAX_FIGURE_CHARS = 500;
/** Letras mínimas de OCR para que una imagen sin pie tenga su propio chunk. */
const MIN_OCR_LETTERS = 30;
/** Una imagen sin pie que empieza en esta franja superior se asocia también a la página anterior. */
const TOP_BAND = 0.15;

interface OpenChunk {
  title: string;
  page: number;
  parts: string[];
  boxes: BoundingBox[];
}

/**
 * Chunking por layout sobre los elementos de Unstructured: cada título abre
 * un chunk, las tablas van completas y solas, se corta por tamaño y por
 * cambio de página, las figuras con pie o con texto de OCR forman su propio
 * chunk y todas las imágenes se asocian además al chunk de texto más cercano.
 */
@Injectable()
export class ChunkingService {
  chunk(elements: UnstructuredElement[]): Chunk[] {
    const repeated = findRepeatedText(elements);
    const kept = elements.filter(
      (e) => !DISCARDED_TYPES.has(e.type) && !repeated.has(e),
    );
    const captionByImage = pairCaptions(kept);
    const captions = new Set(captionByImage.values());

    const chunks: Chunk[] = [];
    const figureChunks = new Set<Chunk>();
    const looseImages: ExtractedImage[] = [];
    let current: OpenChunk | undefined;
    let title = '';

    const flush = () => {
      if (current && current.parts.length > 0) {
        const body = current.parts.join('\n\n');
        const text = withPrefix(current.title, body);
        chunks.push({
          text,
          embeddingText: text,
          page: current.page,
          bbox: union(current.boxes),
          images: [],
        });
      }
      current = undefined;
    };

    for (const element of kept) {
      const page = element.metadata.page_number ?? 1;
      const bbox = normalize(element.metadata.coordinates);

      if (element.type === 'Image') {
        const caption = captionByImage.get(element);
        const ocr = collapse(element.text ?? '');
        // Las imágenes con pie quedan exentas del filtro de tamaño.
        if (!caption && area(bbox) < MIN_IMAGE_AREA) continue;
        if (caption || countLetters(ocr) >= MIN_OCR_LETTERS) {
          const figure = figureChunk(title, element, bbox, caption);
          chunks.push(figure);
          figureChunks.add(figure);
        } else if (element.metadata.image_base64) {
          looseImages.push(toImage(element, bbox));
        }
        continue;
      }

      const text = element.text?.trim();
      if (!text || captions.has(element) || inPageMargin(bbox)) continue;

      if (element.type === 'Title') {
        flush();
        title = text;
        continue;
      }

      if (element.type === 'Table') {
        flush();
        chunks.push({
          text: withPrefix(title, tableContent(element)),
          embeddingText: withPrefix(title, text),
          page,
          bbox,
          images: [],
        });
        continue;
      }

      for (const piece of splitLongText(text)) {
        const exceedsSize =
          current &&
          current.parts.join('\n\n').length + piece.length > MAX_CHUNK_CHARS;
        if (current && (current.page !== page || exceedsSize)) flush();

        current ??= { title, page, parts: [], boxes: [] };
        current.parts.push(piece);
        current.boxes.push(bbox);
      }
    }
    flush();

    const textChunks = chunks.filter((c) => !figureChunks.has(c));
    // Las figuras con chunk propio también acompañan al texto que las rodea,
    // que suele recuperarse mejor que su pie.
    for (const figure of figureChunks) {
      for (const image of figure.images) {
        findClosestChunk(textChunks, image)?.images.push(image);
      }
    }
    for (const image of looseImages) {
      const closest = findClosestChunk(textChunks, image);
      closest?.images.push(image);
      // Suele ilustrar el texto que cierra la página anterior.
      if (image.bbox.y1 < TOP_BAND) {
        const previous = textChunks
          .filter((c) => c.page === image.page - 1)
          .at(-1);
        if (previous && previous !== closest) previous.images.push(image);
      }
    }
    return chunks;
  }
}

/**
 * Elementos de texto que aparecen en la misma posición en varias páginas
 * (encabezados, pies, numeración), sin importar el tipo que les asigne
 * Unstructured. Se exige la repetición en min(3, páginas) páginas, mínimo 2.
 */
function findRepeatedText(
  elements: UnstructuredElement[],
): Set<UnstructuredElement> {
  const pages = new Set(elements.map((e) => e.metadata.page_number ?? 1));
  const minPages = Math.max(2, Math.min(3, pages.size));
  const groups = new Map<
    string,
    { element: UnstructuredElement; page: number; box: BoundingBox }[]
  >();
  for (const element of elements) {
    if (element.type === 'Image' || !element.metadata.coordinates) continue;
    const key = collapse(element.text ?? '')
      .toLowerCase()
      .replace(/\d/g, '#');
    if (!key) continue;
    const group = groups.get(key) ?? [];
    group.push({
      element,
      page: element.metadata.page_number ?? 1,
      box: normalize(element.metadata.coordinates),
    });
    groups.set(key, group);
  }

  const repeated = new Set<UnstructuredElement>();
  for (const group of groups.values()) {
    for (const occurrence of group) {
      const samePlace = group.filter(
        ({ box }) =>
          Math.abs(box.x1 - occurrence.box.x1) < REPEAT_TOLERANCE &&
          Math.abs(box.y1 - occurrence.box.y1) < REPEAT_TOLERANCE,
      );
      if (new Set(samePlace.map(({ page }) => page)).size >= minPages) {
        repeated.add(occurrence.element);
      }
    }
  }
  return repeated;
}

/**
 * Empareja cada pie de figura con la imagen más cercana de su página, de uno
 * a uno, asignando primero los pares más próximos.
 */
function pairCaptions(
  elements: UnstructuredElement[],
): Map<UnstructuredElement, UnstructuredElement> {
  const images = elements.filter((e) => e.type === 'Image');
  const captions = elements.filter(
    (e) => e.type !== 'Image' && CAPTION_PATTERN.test(e.text?.trim() ?? ''),
  );
  const pairs = captions.flatMap((caption) =>
    images
      .filter(
        (image) => image.metadata.page_number === caption.metadata.page_number,
      )
      .map((image) => ({
        image,
        caption,
        distance: distance(
          normalize(image.metadata.coordinates),
          normalize(caption.metadata.coordinates),
        ),
      })),
  );
  pairs.sort((a, b) => a.distance - b.distance);

  const captionByImage = new Map<UnstructuredElement, UnstructuredElement>();
  const used = new Set<UnstructuredElement>();
  for (const { image, caption } of pairs) {
    if (captionByImage.has(image) || used.has(caption)) continue;
    captionByImage.set(image, caption);
    used.add(caption);
  }
  return captionByImage;
}

/**
 * Chunk propio de una figura: el pie primero y luego el texto de OCR de la
 * imagen (sin repetir el pie), hasta MAX_FIGURE_CHARS.
 */
function figureChunk(
  title: string,
  image: UnstructuredElement,
  imageBox: BoundingBox,
  caption?: UnstructuredElement,
): Chunk {
  const captionText = collapse(caption?.text ?? '');
  let ocr = collapse(image.text ?? '');
  if (captionText && ocr.includes(captionText)) {
    ocr = collapse(ocr.replace(captionText, ''));
  }
  const body = [captionText, ocr]
    .filter(Boolean)
    .join('\n\n')
    .slice(0, MAX_FIGURE_CHARS);
  const text = withPrefix(title, body);
  return {
    text,
    embeddingText: text,
    page: image.metadata.page_number ?? 1,
    bbox: caption
      ? union([imageBox, normalize(caption.metadata.coordinates)])
      : imageBox,
    images: image.metadata.image_base64 ? [toImage(image, imageBox)] : [],
  };
}

function toImage(
  element: UnstructuredElement,
  bbox: BoundingBox,
): ExtractedImage {
  return {
    page: element.metadata.page_number ?? 1,
    bbox,
    base64: element.metadata.image_base64!,
    mimeType: element.metadata.image_mime_type ?? 'image/png',
  };
}

function collapse(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function countLetters(text: string): number {
  return text.match(/\p{L}/gu)?.length ?? 0;
}

function inPageMargin(box: BoundingBox): boolean {
  return box.y1 > 1 - PAGE_MARGIN || box.y2 < PAGE_MARGIN;
}

/**
 * Parte un texto más largo que MAX_CHUNK_CHARS por límites de oración. Una
 * oración que por sí sola supera el máximo se corta por caracteres.
 */
function splitLongText(text: string): string[] {
  if (text.length <= MAX_CHUNK_CHARS) return [text];
  const pieces: string[] = [];
  let piece = '';
  for (const sentence of text.split(/(?<=[.!?])\s+/)) {
    if (piece && piece.length + 1 + sentence.length > MAX_CHUNK_CHARS) {
      pieces.push(piece);
      piece = '';
    }
    piece = piece ? `${piece} ${sentence}` : sentence;
    while (piece.length > MAX_CHUNK_CHARS) {
      pieces.push(piece.slice(0, MAX_CHUNK_CHARS));
      piece = piece.slice(MAX_CHUNK_CHARS);
    }
  }
  if (piece) pieces.push(piece);
  return pieces;
}

function withPrefix(title: string, body: string): string {
  return title ? `${title}\n\n${body}` : body;
}

/**
 * HTML de la tabla si está completo; si no, su texto plano. La inferencia de
 * estructura de Unstructured a veces pierde filas.
 */
function tableContent(element: UnstructuredElement): string {
  const html = element.metadata.text_as_html;
  if (!html) return element.text;
  const htmlText = html.replace(/<[^>]*>/g, '').replace(/\s+/g, '');
  const plainText = element.text.replace(/\s+/g, '');
  return htmlText.length < plainText.length ? element.text : html;
}

function normalize(coordinates?: ElementCoordinates): BoundingBox {
  if (!coordinates?.points?.length) return FULL_PAGE;
  const { points, layout_width: width, layout_height: height } = coordinates;
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  return {
    x1: Math.min(...xs) / width,
    y1: Math.min(...ys) / height,
    x2: Math.max(...xs) / width,
    y2: Math.max(...ys) / height,
  };
}

function union(boxes: BoundingBox[]): BoundingBox {
  return {
    x1: Math.min(...boxes.map((b) => b.x1)),
    y1: Math.min(...boxes.map((b) => b.y1)),
    x2: Math.max(...boxes.map((b) => b.x2)),
    y2: Math.max(...boxes.map((b) => b.y2)),
  };
}

function area(box: BoundingBox): number {
  return (box.x2 - box.x1) * (box.y2 - box.y1);
}

/** Distancia mínima entre dos rectángulos; 0 si se solapan. */
function distance(a: BoundingBox, b: BoundingBox): number {
  const dx = Math.max(0, a.x1 - b.x2, b.x1 - a.x2);
  const dy = Math.max(0, a.y1 - b.y2, b.y1 - a.y2);
  return Math.hypot(dx, dy);
}

/**
 * Chunk más cercano de la misma página; si la página no tiene chunks, el
 * último de la página anterior más próxima, y si no hay ninguno antes, el
 * primero posterior.
 */
function findClosestChunk(
  chunks: Chunk[],
  image: ExtractedImage,
): Chunk | undefined {
  const samePage = chunks.filter((c) => c.page === image.page);
  if (samePage.length > 0) {
    return samePage.reduce((best, c) =>
      distance(c.bbox, image.bbox) < distance(best.bbox, image.bbox) ? c : best,
    );
  }
  const before = chunks.filter((c) => c.page < image.page);
  return before.at(-1) ?? chunks.find((c) => c.page > image.page);
}
