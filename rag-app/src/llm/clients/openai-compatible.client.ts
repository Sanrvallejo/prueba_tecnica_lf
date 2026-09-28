import {
  BadGatewayException,
  GatewayTimeoutException,
  ServiceUnavailableException,
} from '@nestjs/common';
import OpenAI, {
  APIConnectionError,
  APIConnectionTimeoutError,
  APIError,
  NotFoundError,
} from 'openai';
import { ChatMessage, LlmClient } from '../interfaces/llm-client.interface.js';

/** Un modelo local en CPU puede tardar más de un minuto con el contexto completo. */
const LLM_TIMEOUT_MS = 120_000;

/**
 * Cliente para cualquier proveedor que implemente la API de Chat Completions
 * de OpenAI (OpenAI, Ollama, OpenRouter).
 */
export class OpenAICompatibleClient implements LlmClient {
  private readonly client: OpenAI;

  constructor(
    baseURL: string,
    apiKey: string,
    private readonly model: string,
  ) {
    // Sin reintentos por ahora: se agregarán en el paso de resiliencia.
    this.client = new OpenAI({
      baseURL,
      apiKey,
      timeout: LLM_TIMEOUT_MS,
      maxRetries: 0,
    });
  }

  async generate(messages: ChatMessage[]): Promise<string> {
    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages,
      });
      return completion.choices[0]?.message?.content ?? '';
    } catch (error) {
      throw this.toHttpError(error);
    }
  }

  /** Traduce los errores del SDK a errores HTTP con un mensaje legible. */
  private toHttpError(error: unknown): Error {
    if (error instanceof APIConnectionTimeoutError) {
      return new GatewayTimeoutException(
        `El modelo ${this.model} no respondió en ${LLM_TIMEOUT_MS / 1000} s`,
      );
    }
    if (error instanceof APIConnectionError) {
      return new ServiceUnavailableException(
        `No se pudo conectar con el proveedor del modelo ${this.model}`,
      );
    }
    if (error instanceof NotFoundError) {
      return new ServiceUnavailableException(
        `El modelo ${this.model} no está disponible en su proveedor`,
      );
    }
    if (error instanceof APIError) {
      return new BadGatewayException(
        `El proveedor del modelo ${this.model} respondió con un error (${error.status ?? 'sin estado'})`,
      );
    }
    return error instanceof Error ? error : new Error(String(error));
  }
}
