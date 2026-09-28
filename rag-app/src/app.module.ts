import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ChatModule } from './chat/chat.module.js';
import { DocumentsModule } from './documents/documents.module.js';
import { EmbeddingsModule } from './embeddings/embeddings.module.js';
import { LlmModule } from './llm/llm.module.js';
import { RetrievalModule } from './retrieval/retrieval.module.js';
import { VectorStoreModule } from './vector-store/vector-store.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'redis'),
          port: Number(config.get<string>('REDIS_PORT', '6379')),
        },
      }),
    }),
    LlmModule,
    EmbeddingsModule,
    VectorStoreModule,
    DocumentsModule,
    RetrievalModule,
    ChatModule,
  ],
})
export class AppModule {}
