export interface ChatSource {
  documentId: string;
  documentName: string;
  page: number;
}

export interface ChatResponseDto {
  answer: string;
  sources: ChatSource[];
  /** URLs relativas; cada imagen aparece una sola vez. */
  images: string[];
}
