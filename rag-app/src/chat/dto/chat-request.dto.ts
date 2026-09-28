import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export const MAX_MESSAGE_CHARS = 1000;
/** Tope de seguridad; el servicio usa solo los últimos mensajes. */
const MAX_HISTORY_ITEMS = 50;

export class HistoryMessageDto {
  // El cliente no puede enviar mensajes de sistema.
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @IsString()
  content: string;
}

export class ChatRequestDto {
  /** Id de GET /models; si falta, se usa Ollama. */
  @IsOptional()
  @IsString()
  model?: string;

  @IsString()
  @Matches(/\S/, { message: 'message no puede estar vacío' })
  @MaxLength(MAX_MESSAGE_CHARS)
  message: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_HISTORY_ITEMS)
  @ValidateNested({ each: true })
  @Type(() => HistoryMessageDto)
  history?: HistoryMessageDto[];
}
