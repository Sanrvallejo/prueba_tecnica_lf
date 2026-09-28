import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { EmbeddingsModule } from '../embeddings/embeddings.module.js';
import { VectorStoreModule } from '../vector-store/vector-store.module.js';
import { ChunkingService } from './chunking.service.js';
import { DocumentsController } from './documents.controller.js';
import { DocumentsService } from './documents.service.js';
import { UnstructuredClient } from './extraction/unstructured.client.js';
import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';
import { ImageStorageService } from './image-storage.service.js';
import { IngestionProcessor } from './ingestion.processor.js';
import { INGESTION_QUEUE } from './interfaces/ingestion-job.interface.js';
import { JobsController } from './jobs.controller.js';
import { SystemReadyGuard } from './system-ready.guard.js';

@Module({
  imports: [
    BullModule.registerQueue({
      name: INGESTION_QUEUE,
      defaultJobOptions: {
        // Un solo intento: reintentar una extracción hi_res cuesta minutos.
        attempts: 1,
        // Los trabajos son el registro de documentos (GET /documents).
        removeOnComplete: false,
        removeOnFail: false,
      },
    }),
    EmbeddingsModule,
    VectorStoreModule,
  ],
  controllers: [DocumentsController, JobsController, HealthController],
  providers: [
    DocumentsService,
    UnstructuredClient,
    ChunkingService,
    ImageStorageService,
    IngestionProcessor,
    HealthService,
    SystemReadyGuard,
  ],
})
export class DocumentsModule {}
