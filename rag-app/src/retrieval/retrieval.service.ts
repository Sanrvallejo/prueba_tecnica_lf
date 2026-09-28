import { Inject, Injectable, Logger } from '@nestjs/common';
import { EmbeddingsService } from '../embeddings/embeddings.service.js';
import {
  type SearchResult,
  VECTOR_STORE,
  type VectorStore,
} from '../vector-store/interfaces/vector-store.interface.js';

/** Chunks más similares que se consideran; ver ADR-0018. */
const TOP_K = 3;
/**
 * Tope de caracteres del contexto enviado al LLM, para que con una ventana de
 * 4096 tokens el prompt de sistema nunca se recorte; ver ADR-0018.
 */
const MAX_CONTEXT_CHARS = 6000;

@Injectable()
export class RetrievalService {
  private readonly logger = new Logger(RetrievalService.name);

  constructor(
    private readonly embeddings: EmbeddingsService,
    @Inject(VECTOR_STORE) private readonly vectorStore: VectorStore,
  ) {}

  /**
   * Chunks relevantes para la consulta: los TOP_K más similares que superan el
   * umbral del modelo de embeddings, recortados al tope de contexto. Vacío si
   * ninguno lo supera.
   */
  async retrieve(query: string): Promise<SearchResult[]> {
    const vector = await this.embeddings.embedQuery(query);
    const results = await this.vectorStore.search(vector, TOP_K);
    const minScore = this.embeddings.minScore;
    const relevant = results.filter(({ score }) => score >= minScore);

    this.logger.log(
      `Mejor puntaje ${results[0]?.score.toFixed(3) ?? 'sin resultados'} ` +
        `(umbral ${minScore}): ${relevant.length} de ${results.length} aceptados`,
    );
    return fitToContext(relevant);
  }
}

/** Mantiene los resultados en orden hasta el tope; el que lo excede se recorta. */
function fitToContext(results: SearchResult[]): SearchResult[] {
  const fitted: SearchResult[] = [];
  let remaining = MAX_CONTEXT_CHARS;
  for (const result of results) {
    if (remaining <= 0) break;
    const { text } = result.payload;
    fitted.push(
      text.length <= remaining
        ? result
        : {
            ...result,
            payload: { ...result.payload, text: text.slice(0, remaining) },
          },
    );
    remaining -= text.length;
  }
  return fitted;
}
