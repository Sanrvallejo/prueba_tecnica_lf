import { Module } from '@nestjs/common';
import { ChunkingService } from './chunking.service.js';
import { UnstructuredClient } from './extraction/unstructured.client.js';

@Module({
  providers: [UnstructuredClient, ChunkingService],
})
export class DocumentsModule {}
