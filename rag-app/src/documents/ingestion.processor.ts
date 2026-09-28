import { rm } from 'node:fs/promises';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EmbeddingsService } from '../embeddings/embeddings.service.js';
import {
  VECTOR_STORE,
  type VectorStore,
} from '../vector-store/interfaces/vector-store.interface.js';
import { ChunkingService } from './chunking.service.js';
import { UnstructuredClient } from './extraction/unstructured.client.js';
import { ImageStorageService } from './image-storage.service.js';
import {
  INGESTION_QUEUE,
  IngestionJobData,
  IngestionResult,
  IngestionStage,
} from './interfaces/ingestion-job.interface.js';

const STAGE_ERRORS: Record<IngestionStage, string> = {
  extracting: 'Falló la extracción del PDF con Unstructured',
  chunking: 'Falló la división del documento en fragmentos',
  embedding: 'Falló la generación de embeddings',
  indexing: 'Falló la indexación en la base vectorial',
};

/**
 * Worker de ingesta: extrae, divide, genera embeddings e indexa un PDF. Corre
 * de a un documento a la vez porque la extracción hi_res es intensiva.
 */
@Processor(INGESTION_QUEUE, { concurrency: 1 })
export class IngestionProcessor extends WorkerHost {
  private readonly logger = new Logger(IngestionProcessor.name);

  constructor(
    private readonly unstructured: UnstructuredClient,
    private readonly chunking: ChunkingService,
    private readonly imageStorage: ImageStorageService,
    private readonly embeddings: EmbeddingsService,
    @Inject(VECTOR_STORE) private readonly vectorStore: VectorStore,
  ) {
    super();
  }

  async process(job: Job<IngestionJobData>): Promise<IngestionResult> {
    const { documentId, documentName, filePath } = job.data;
    let stage: IngestionStage = 'extracting';
    const report = (percent: number) =>
      job.updateProgress({ stage, percent: Math.round(percent) });

    try {
      await report(0);
      const elements = await this.unstructured.partition(
        filePath,
        documentName,
      );

      stage = 'chunking';
      await report(20);
      const chunks = this.chunking.chunk(elements);
      if (chunks.length === 0) {
        throw new Error('el documento no contiene texto extraíble');
      }
      const imageUrls = await this.imageStorage.save(documentId, chunks);

      stage = 'embedding';
      await report(30);
      const vectors = await this.embeddings.embedDocuments(
        chunks.map((chunk) => chunk.embeddingText),
        (done, total) => report(30 + (60 * done) / total),
      );

      stage = 'indexing';
      await report(90);
      await this.vectorStore.upsert(
        chunks.map((chunk, i) => ({
          vector: vectors[i],
          payload: {
            text: chunk.text,
            documentId,
            documentName,
            page: chunk.page,
            bbox: chunk.bbox,
            images: imageUrls[i],
          },
        })),
      );
      await report(100);

      const result = { chunks: chunks.length, images: imageUrls.flat().length };
      this.logger.log(
        `${documentName}: ${result.chunks} chunks y ${result.images} imágenes indexados`,
      );
      return result;
    } catch (error) {
      await this.imageStorage.remove(documentId);
      const message = `${STAGE_ERRORS[stage]}: ${describe(error)}`;
      this.logger.error(`${documentName}: ${message}`);
      throw new Error(message);
    } finally {
      await rm(filePath, { force: true });
    }
  }
}

/** Mensaje legible, incluyendo la causa de errores de red (p. ej. ECONNREFUSED). */
function describe(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const cause = error.cause as { code?: string; message?: string } | undefined;
  const detail = cause?.code ?? cause?.message;
  return detail ? `${error.message} (${detail})` : error.message;
}
