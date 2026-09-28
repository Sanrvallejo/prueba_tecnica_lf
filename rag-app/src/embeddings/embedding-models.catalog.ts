import { EmbeddingModelSpec } from './interfaces/embedding-model-spec.interface.js';

/**
 * Modelos de embeddings soportados. Es la única fuente de la dimensión de los
 * vectores, de los prefijos de tarea que cada modelo espera, de su límite de
 * entrada y del umbral mínimo de similitud.
 */
export const EMBEDDING_MODELS: Record<string, EmbeddingModelSpec> = {
  // Ollama lo ejecuta con un contexto de 2048 tokens.
  'nomic-embed-text': {
    dimension: 768,
    documentPrefix: 'search_document: ',
    queryPrefix: 'search_query: ',
    maxInputChars: 4000,
    // Provisional: se recalibra tras las correcciones de chunking (ADR-0018).
    minScore: 0.62,
  },
  // Contexto de 8191 tokens.
  'text-embedding-3-small': {
    dimension: 1536,
    documentPrefix: '',
    queryPrefix: '',
    maxInputChars: 24000,
    // Provisional, sin calibrar (ADR-0018).
    minScore: 0.3,
  },
};
