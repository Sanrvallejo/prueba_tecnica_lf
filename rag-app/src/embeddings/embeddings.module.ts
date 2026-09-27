import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAICompatibleEmbeddingClient } from './clients/openai-compatible.embedding-client.js';
import { EMBEDDING_MODELS } from './embedding-models.catalog.js';
import { EmbeddingsService } from './embeddings.service.js';
import {
  EMBEDDING_CLIENT,
  EmbeddingClient,
} from './interfaces/embedding-client.interface.js';

function createEmbeddingClient(config: ConfigService): EmbeddingClient {
  const backend = config.get<string>('EMBEDDING_BACKEND', 'ollama');

  let baseURL: string;
  let apiKey: string;
  let model: string;

  switch (backend) {
    case 'ollama':
      baseURL = `${config.get<string>('OLLAMA_URL', 'http://ollama:11434')}/v1`;
      // Ollama no valida la API key, pero el SDK exige una.
      apiKey = 'ollama';
      model = config.get<string>('OLLAMA_EMBEDDING_MODEL', 'nomic-embed-text');
      break;
    case 'openai': {
      const key = config.get<string>('OPENAI_API_KEY');
      if (!key) {
        throw new Error('EMBEDDING_BACKEND=openai requiere OPENAI_API_KEY');
      }
      baseURL = 'https://api.openai.com/v1';
      apiKey = key;
      model = config.get<string>(
        'OPENAI_EMBEDDING_MODEL',
        'text-embedding-3-small',
      );
      break;
    }
    default:
      throw new Error(
        `EMBEDDING_BACKEND desconocido: ${backend} (valores válidos: ollama, openai)`,
      );
  }

  const spec = EMBEDDING_MODELS[model];
  if (!spec) {
    throw new Error(
      `El modelo de embeddings ${model} no está en el catálogo: agrégalo a ` +
        `embedding-models.catalog.ts con su dimensión y sus prefijos`,
    );
  }

  return new OpenAICompatibleEmbeddingClient(baseURL, apiKey, model, spec);
}

@Module({
  providers: [
    {
      provide: EMBEDDING_CLIENT,
      useFactory: createEmbeddingClient,
      inject: [ConfigService],
    },
    EmbeddingsService,
  ],
  exports: [EmbeddingsService],
})
export class EmbeddingsModule {}
