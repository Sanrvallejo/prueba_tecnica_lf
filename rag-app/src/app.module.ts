import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmbeddingsModule } from './embeddings/embeddings.module.js';
import { LlmModule } from './llm/llm.module.js';
import { VectorStoreModule } from './vector-store/vector-store.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    LlmModule,
    EmbeddingsModule,
    VectorStoreModule,
  ],
})
export class AppModule {}
