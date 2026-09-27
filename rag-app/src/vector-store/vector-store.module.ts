import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmbeddingsModule } from '../embeddings/embeddings.module.js';
import { EmbeddingsService } from '../embeddings/embeddings.service.js';
import { VECTOR_STORE } from './interfaces/vector-store.interface.js';
import { QdrantVectorStore } from './stores/qdrant.vector-store.js';

@Module({
  imports: [EmbeddingsModule],
  providers: [
    {
      provide: VECTOR_STORE,
      useFactory: (config: ConfigService, embeddings: EmbeddingsService) =>
        new QdrantVectorStore(
          config.get<string>('QDRANT_URL', 'http://qdrant:6333'),
          config.get<string>('QDRANT_COLLECTION', 'documents'),
          embeddings.dimension,
        ),
      inject: [ConfigService, EmbeddingsService],
    },
  ],
  exports: [VECTOR_STORE],
})
export class VectorStoreModule {}
