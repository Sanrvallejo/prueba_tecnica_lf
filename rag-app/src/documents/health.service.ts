import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { EmbeddingsService } from '../embeddings/embeddings.service.js';
import {
  VECTOR_STORE,
  type VectorStore,
} from '../vector-store/interfaces/vector-store.interface.js';
import { UnstructuredClient } from './extraction/unstructured.client.js';
import { INGESTION_QUEUE } from './interfaces/ingestion-job.interface.js';

const CHECK_TIMEOUT_MS = 3000;

export interface HealthStatus {
  ready: boolean;
  embeddings: boolean;
  vectorStore: boolean;
  unstructured: boolean;
  redis: boolean;
}

/** Comprueba que todos los servicios que necesita la ingesta estén listos. */
@Injectable()
export class HealthService {
  constructor(
    private readonly embeddings: EmbeddingsService,
    @Inject(VECTOR_STORE) private readonly vectorStore: VectorStore,
    private readonly unstructured: UnstructuredClient,
    @InjectQueue(INGESTION_QUEUE) private readonly queue: Queue,
  ) {}

  async check(): Promise<HealthStatus> {
    const [embeddings, vectorStore, unstructured, redis] = await Promise.all([
      withTimeout(this.embeddings.isReady()),
      withTimeout(this.vectorStore.isReady()),
      withTimeout(this.unstructured.isReady()),
      withTimeout(this.queue.getJobCounts().then(() => true)),
    ]);
    return {
      ready: embeddings && vectorStore && unstructured && redis,
      embeddings,
      vectorStore,
      unstructured,
      redis,
    };
  }
}

/** Cualquier error o demora mayor a CHECK_TIMEOUT_MS cuenta como no listo. */
function withTimeout(check: Promise<boolean>): Promise<boolean> {
  const timeout = new Promise<boolean>((resolve) =>
    setTimeout(() => resolve(false), CHECK_TIMEOUT_MS).unref(),
  );
  return Promise.race([check.catch(() => false), timeout]);
}
