import { BadRequestException, Injectable } from '@nestjs/common';
import { ChatMessage } from '../llm/interfaces/llm-client.interface.js';
import { LlmService } from '../llm/llm.service.js';
import { RetrievalService } from '../retrieval/retrieval.service.js';
import type { SearchResult } from '../vector-store/interfaces/vector-store.interface.js';
import { ChatRequestDto, HistoryMessageDto } from './dto/chat-request.dto.js';
import { ChatResponseDto, ChatSource } from './dto/chat-response.dto.js';
import {
  GENERIC_ANSWER,
  NO_INFO_MARK,
  buildSystemPrompt,
} from './prompts/system-prompt.js';

/** Últimos mensajes del historial que se envían al LLM (3 turnos). */
const HISTORY_MAX_MESSAGES = 6;
/** Unos 600 tokens, la parte del historial en la ventana de 4096 (ADR-0018). */
const HISTORY_MAX_CHARS = 2400;
/** La respuesta es solo la marca, con espacios o puntuación alrededor. */
const NO_INFO_PATTERN = new RegExp(
  `^[\\s\\p{P}]*${NO_INFO_MARK}[\\s\\p{P}]*$`,
  'u',
);
/** Citas como [1], [2] o [1, 3]. */
const CITATION_PATTERN = /\[(\d+(?:\s*,\s*\d+)*)\]/g;

@Injectable()
export class ChatService {
  constructor(
    private readonly llm: LlmService,
    private readonly retrieval: RetrievalService,
  ) {}

  async chat({
    model,
    message,
    history = [],
  }: ChatRequestDto): Promise<ChatResponseDto> {
    const modelId = model ?? this.llm.defaultModel();
    if (!this.llm.listModels().includes(modelId)) {
      throw new BadRequestException(`Modelo no disponible: ${modelId}`);
    }

    const fragments = await this.retrieveWithFallback(message, history);
    if (fragments.length === 0) return noInformation();

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: buildSystemPrompt(
          fragments.map(({ payload }) => ({
            text: payload.text,
            documentName: payload.documentName,
            page: payload.page,
          })),
        ),
      },
      ...trimHistory(history),
      { role: 'user', content: message },
    ];
    const answer = (await this.llm.generate(modelId, messages)).trim();
    if (!answer || NO_INFO_PATTERN.test(answer)) return noInformation();

    const cited = citedFragments(answer, fragments);
    return {
      answer,
      sources: uniqueSources(cited),
      images: [...new Set(cited.flatMap(({ payload }) => payload.images))],
    };
  }

  /**
   * Busca con la pregunta actual; si nada supera el umbral, reintenta con la
   * pregunta anterior del usuario más la actual, para los seguimientos.
   */
  private async retrieveWithFallback(
    message: string,
    history: HistoryMessageDto[],
  ): Promise<SearchResult[]> {
    const results = await this.retrieval.retrieve(message);
    const previous = history.findLast(({ role }) => role === 'user');
    if (results.length > 0 || !previous) return results;
    return this.retrieval.retrieve(`${previous.content} ${message}`);
  }
}

function noInformation(): ChatResponseDto {
  return { answer: GENERIC_ANSWER, sources: [], images: [] };
}

/** Últimos mensajes del historial, descartando los más antiguos hasta el tope de caracteres. */
function trimHistory(history: HistoryMessageDto[]): ChatMessage[] {
  const recent = history.slice(-HISTORY_MAX_MESSAGES);
  let total = recent.reduce((sum, { content }) => sum + content.length, 0);
  while (recent.length > 0 && total > HISTORY_MAX_CHARS) {
    total -= recent.shift()!.content.length;
  }
  return recent.map(({ role, content }) => ({ role, content }));
}

/** Fragmentos citados con [n]; si no hay citas válidas, todos los recuperados. */
function citedFragments(
  answer: string,
  fragments: SearchResult[],
): SearchResult[] {
  const cited = new Set<number>();
  for (const [, numbers] of answer.matchAll(CITATION_PATTERN)) {
    for (const n of numbers.split(',').map(Number)) {
      if (n >= 1 && n <= fragments.length) cited.add(n - 1);
    }
  }
  return cited.size === 0
    ? fragments
    : fragments.filter((_, i) => cited.has(i));
}

/** Una fuente por documento y página, en orden de relevancia. */
function uniqueSources(fragments: SearchResult[]): ChatSource[] {
  const sources = new Map<string, ChatSource>();
  for (const { payload } of fragments) {
    const key = `${payload.documentId}:${payload.page}`;
    if (!sources.has(key)) {
      sources.set(key, {
        documentId: payload.documentId,
        documentName: payload.documentName,
        page: payload.page,
      });
    }
  }
  return [...sources.values()];
}
