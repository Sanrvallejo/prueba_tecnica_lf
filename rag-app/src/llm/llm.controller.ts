import { Controller, Get } from '@nestjs/common';
import { LlmService } from './llm.service.js';

@Controller('models')
export class LlmController {
  constructor(private readonly llmService: LlmService) {}

  @Get()
  listModels(): string[] {
    return this.llmService.listModels();
  }
}
