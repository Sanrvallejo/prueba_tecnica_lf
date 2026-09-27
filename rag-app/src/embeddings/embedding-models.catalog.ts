import { EmbeddingModelSpec } from './interfaces/embedding-model-spec.interface.js';

/**
 * Modelos de embeddings soportados. Es la única fuente de la dimensión de los
 * vectores y de los prefijos de tarea que cada modelo espera.
 */
export const EMBEDDING_MODELS: Record<string, EmbeddingModelSpec> = {
  'nomic-embed-text': {
    dimension: 768,
    documentPrefix: 'search_document: ',
    queryPrefix: 'search_query: ',
  },
  'text-embedding-3-small': {
    dimension: 1536,
    documentPrefix: '',
    queryPrefix: '',
  },
};
