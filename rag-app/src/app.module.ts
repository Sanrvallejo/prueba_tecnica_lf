import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmbeddingsModule } from './embeddings/embeddings.module.js';
import { LlmModule } from './llm/llm.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    LlmModule,
    EmbeddingsModule,
  ],
})
export class AppModule {}
