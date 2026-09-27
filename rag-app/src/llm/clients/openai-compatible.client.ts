import OpenAI from 'openai';
import { ChatMessage, LlmClient } from '../interfaces/llm-client.interface.js';

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
    this.client = new OpenAI({ baseURL, apiKey });
  }

  async generate(messages: ChatMessage[]): Promise<string> {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages,
    });
    return completion.choices[0]?.message?.content ?? '';
  }
}
