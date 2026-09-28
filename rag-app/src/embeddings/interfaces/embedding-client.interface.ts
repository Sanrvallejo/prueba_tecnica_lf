export const EMBEDDING_CLIENT = Symbol('EMBEDDING_CLIENT');

export interface EmbeddingClient {
  readonly dimension: number;
  readonly minScore: number;
  embedDocuments(texts: string[]): Promise<number[][]>;
  embedQuery(text: string): Promise<number[]>;
  isReady(): Promise<boolean>;
}
