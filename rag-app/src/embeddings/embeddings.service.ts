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

  get minScore(): number {
    return this.client.minScore;
  }

  /**
   * @param onBatch se llama tras cada lote con los textos procesados y el
   * total, para reportar progreso.
   */
  async embedDocuments(
    texts: string[],
    onBatch?: (done: number, total: number) => Promise<void> | void,
  ): Promise<number[][]> {
    const vectors: number[][] = [];
    for (let i = 0; i < texts.length; i += EMBEDDING_BATCH_SIZE) {
      const batch = texts.slice(i, i + EMBEDDING_BATCH_SIZE);
      vectors.push(...(await this.client.embedDocuments(batch)));
      await onBatch?.(vectors.length, texts.length);
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
