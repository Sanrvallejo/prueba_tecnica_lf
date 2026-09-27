export const VECTOR_STORE = Symbol('VECTOR_STORE');

/** Coordenadas normalizadas entre 0 y 1 respecto al ancho y alto de la página. */
export interface BoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface ChunkPayload {
  text: string;
  documentId: string;
  documentName: string;
  page: number;
  bbox: BoundingBox;
  images: string[];
}

export interface VectorPoint {
  vector: number[];
  payload: ChunkPayload;
}

export interface SearchResult {
  score: number;
  payload: ChunkPayload;
}

export interface VectorStore {
  upsert(points: VectorPoint[]): Promise<void>;
  search(vector: number[], limit: number): Promise<SearchResult[]>;
  isReady(): Promise<boolean>;
}
