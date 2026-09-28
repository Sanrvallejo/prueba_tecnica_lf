import { BoundingBox } from '../../vector-store/interfaces/vector-store.interface.js';

export interface ExtractedImage {
  page: number;
  bbox: BoundingBox;
  base64: string;
  mimeType: string;
}

export interface Chunk {
  /** Texto que verá el LLM, con el título de la sección como prefijo (HTML en tablas). */
  text: string;
  /** Texto que se convierte en embedding: siempre texto plano, con el mismo prefijo. */
  embeddingText: string;
  page: number;
  bbox: BoundingBox;
  images: ExtractedImage[];
}
