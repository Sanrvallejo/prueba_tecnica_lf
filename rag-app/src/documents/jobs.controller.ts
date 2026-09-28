import { Controller, Get, Param } from '@nestjs/common';
import { DocumentsService } from './documents.service.js';
import { JobView } from './interfaces/ingestion-job.interface.js';

@Controller('jobs')
export class JobsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get(':id')
  get(@Param('id') id: string): Promise<JobView> {
    return this.documents.getJob(id);
  }
}
