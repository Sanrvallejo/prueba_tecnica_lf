import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAICompatibleClient } from './clients/openai-compatible.client.js';
import { ChatMessage, LlmClient } from './interfaces/llm-client.interface.js';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly clients = new Map<string, LlmClient>();

  constructor(config: ConfigService) {
    // Ollama: siempre disponible, es el modelo por defecto
    const ollamaUrl = config.get<string>('OLLAMA_URL', 'http://ollama:11434');
    const ollamaModel = config.get<string>('OLLAMA_LLM_MODEL', 'llama3.2');
    this.clients.set(
      `ollama:${ollamaModel}`,
      new OpenAICompatibleClient(`${ollamaUrl}/v1`, 'ollama', ollamaModel),
    );

    // OpenAI: solo si hay key y modelo configurados
    const openaiKey = config.get<string>('OPENAI_API_KEY');
    const openaiModel = config.get<string>('OPENAI_MODEL');
    if (openaiKey && openaiModel) {
      this.clients.set(
        `openai:${openaiModel}`,
        new OpenAICompatibleClient(
          'https://api.openai.com/v1',
          openaiKey,
          openaiModel,
        ),
      );
    }

    this.logger.log(`Modelos disponibles: ${this.listModels().join(', ')}`);
  }

  listModels(): string[] {
    return [...this.clients.keys()];
  }

  generate(modelId: string, messages: ChatMessage[]): Promise<string> {
    const client = this.clients.get(modelId);
    if (!client) {
      throw new BadRequestException(`Modelo no disponible: ${modelId}`);
    }
    return client.generate(messages);
  }
}
