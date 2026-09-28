import OpenAI from 'openai';
import { EmbeddingClient } from '../interfaces/embedding-client.interface.js';
import { EmbeddingModelSpec } from '../interfaces/embedding-model-spec.interface.js';

/**
 * Cliente de embeddings para proveedores que implementan la API de embeddings
 * de OpenAI (OpenAI, Ollama). Hace una sola petición por llamada; los lotes
 * los arma EmbeddingsService.
 */
export class OpenAICompatibleEmbeddingClient implements EmbeddingClient {
  private readonly client: OpenAI;
  private dimensionChecked = false;

  constructor(
    baseURL: string,
    apiKey: string,
    private readonly model: string,
    private readonly spec: EmbeddingModelSpec,
  ) {
    this.client = new OpenAI({ baseURL, apiKey });
  }

  get dimension(): number {
    return this.spec.dimension;
  }

  embedDocuments(texts: string[]): Promise<number[][]> {
    return this.embed(texts.map((text) => this.spec.documentPrefix + text));
  }

  async embedQuery(text: string): Promise<number[]> {
    const [vector] = await this.embed([this.spec.queryPrefix + text]);
    return vector;
  }

  async isReady(): Promise<boolean> {
    try {
      const models = await this.client.models.list();
      // Ollama lista los modelos con etiqueta (nomic-embed-text:latest).
      return models.data.some(
        ({ id }) => id === this.model || id === `${this.model}:latest`,
      );
    } catch {
      return false;
    }
  }

  private async embed(input: string[]): Promise<number[][]> {
    const response = await this.client.embeddings.create({
      model: this.model,
      // Se recorta para no exceder el contexto del modelo.
      input: input.map((text) => text.slice(0, this.spec.maxInputChars)),
    });
    const vectors = response.data.map(({ embedding }) => embedding);
    this.checkDimension(vectors[0]);
    return vectors;
  }

  private checkDimension(vector: number[] | undefined): void {
    if (this.dimensionChecked || !vector) return;
    if (vector.length !== this.spec.dimension) {
      throw new Error(
        `El modelo ${this.model} devolvió vectores de ${vector.length} dimensiones, ` +
          `pero el catálogo declara ${this.spec.dimension}: corrige su entrada en embedding-models.catalog.ts`,
      );
    }
    this.dimensionChecked = true;
  }
}
