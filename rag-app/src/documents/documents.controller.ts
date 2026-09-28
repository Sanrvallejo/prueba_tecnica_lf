import { tmpdir } from 'node:os';
import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService, isPdfUpload } from './documents.service.js';
import { JobView } from './interfaces/ingestion-job.interface.js';
import { SystemReadyGuard } from './system-ready.guard.js';

const MAX_FILE_SIZE = 20 * 1024 * 1024;

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Post()
  @HttpCode(202)
  @UseGuards(SystemReadyGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      // Archivo temporal: el worker lo borra al terminar, bien o mal.
      dest: tmpdir(),
      // Superar el límite responde 413.
      limits: { fileSize: MAX_FILE_SIZE, files: 1 },
      fileFilter: (_req, file, accept) =>
        isPdfUpload(file)
          ? accept(null, true)
          : accept(
              new BadRequestException('Solo se aceptan archivos PDF'),
              false,
            ),
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<{ jobId: string }> {
    return { jobId: await this.documents.enqueue(file) };
  }

  @Get()
  list(): Promise<JobView[]> {
    return this.documents.listJobs();
  }
}
