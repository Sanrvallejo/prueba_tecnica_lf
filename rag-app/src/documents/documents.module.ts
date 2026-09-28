import { Module } from '@nestjs/common';
import { UnstructuredClient } from './extraction/unstructured.client.js';

@Module({
  providers: [UnstructuredClient],
})
export class DocumentsModule {}
