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

interface OpenChunk {
  title: string;
  page: number;
  parts: string[];
  boxes: BoundingBox[];
}

/**
 * Chunking por layout sobre los elementos de Unstructured: cada título abre
 * un chunk, las tablas van completas y solas, se corta por tamaño y por
 * cambio de página, y cada imagen se asocia al chunk más cercano.
 */
@Injectable()
export class ChunkingService {
  chunk(elements: UnstructuredElement[]): Chunk[] {
    const chunks: Chunk[] = [];
    const images: ExtractedImage[] = [];
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

    for (const element of elements) {
      if (DISCARDED_TYPES.has(element.type)) continue;
      const page = element.metadata.page_number ?? 1;
      const bbox = normalize(element.metadata.coordinates);

      if (element.type === 'Image') {
        const { image_base64, image_mime_type } = element.metadata;
        if (image_base64 && area(bbox) >= MIN_IMAGE_AREA) {
          images.push({
            page,
            bbox,
            base64: image_base64,
            mimeType: image_mime_type ?? 'image/png',
          });
        }
        continue;
      }

      const text = element.text?.trim();
      if (!text || inPageMargin(bbox)) continue;

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

    for (const image of images) {
      findClosestChunk(chunks, image)?.images.push(image);
    }
    return chunks;
  }
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
