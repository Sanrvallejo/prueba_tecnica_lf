import { Module } from '@nestjs/common';
import { EmbeddingsModule } from '../embeddings/embeddings.module.js';
import { VectorStoreModule } from '../vector-store/vector-store.module.js';
import { RetrievalService } from './retrieval.service.js';

@Module({
  imports: [EmbeddingsModule, VectorStoreModule],
  providers: [RetrievalService],
  exports: [RetrievalService],
})
export class RetrievalModule {}
