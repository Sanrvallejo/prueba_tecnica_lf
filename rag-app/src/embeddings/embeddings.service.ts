import { Inject, Injectable } from '@nestjs/common';
import {
  EMBEDDING_CLIENT,
  type EmbeddingClient,
} from './interfaces/embedding-client.interface.js';

const EMBEDDING_BATCH_SIZE = 32;

@Injectable()
export class EmbeddingsService {
  constructor(
    @Inject(EMBEDDING_CLIENT) private readonly client: EmbeddingClient,
  ) {}

  get dimension(): number {
    return this.client.dimension;
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    const vectors: number[][] = [];
    for (let i = 0; i < texts.length; i += EMBEDDING_BATCH_SIZE) {
      const batch = texts.slice(i, i + EMBEDDING_BATCH_SIZE);
      vectors.push(...(await this.client.embedDocuments(batch)));
    }
    return vectors;
  }

  embedQuery(text: string): Promise<number[]> {
    return this.client.embedQuery(text);
  }

  isReady(): Promise<boolean> {
    return this.client.isReady();
  }
}
