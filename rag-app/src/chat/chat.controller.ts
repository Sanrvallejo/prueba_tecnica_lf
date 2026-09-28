import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ChatService } from './chat.service.js';
import { ChatRequestDto } from './dto/chat-request.dto.js';
import { ChatResponseDto } from './dto/chat-response.dto.js';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @HttpCode(200)
  chat(@Body() request: ChatRequestDto): Promise<ChatResponseDto> {
    return this.chatService.chat(request);
  }
}
