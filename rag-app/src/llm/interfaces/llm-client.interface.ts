export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface LlmClient {
  generate(messages: ChatMessage[]): Promise<string>;
}
