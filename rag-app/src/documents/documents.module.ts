import { Module } from '@nestjs/common';
import { ChunkingService } from './chunking.service.js';
import { UnstructuredClient } from './extraction/unstructured.client.js';
import { ImageStorageService } from './image-storage.service.js';

@Module({
  providers: [UnstructuredClient, ChunkingService, ImageStorageService],
})
export class DocumentsModule {}
