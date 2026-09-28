import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module.js';
import { RetrievalModule } from '../retrieval/retrieval.module.js';
import { ChatController } from './chat.controller.js';
import { ChatService } from './chat.service.js';

@Module({
  imports: [LlmModule, RetrievalModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
