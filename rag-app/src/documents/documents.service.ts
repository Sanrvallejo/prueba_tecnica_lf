import { randomUUID } from 'node:crypto';
import { open, rm } from 'node:fs/promises';
import { extname } from 'node:path';
import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import {
  INGESTION_QUEUE,
  IngestionJobData,
  IngestionProgress,
  JobStatus,
  JobView,
} from './interfaces/ingestion-job.interface.js';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectQueue(INGESTION_QUEUE)
    private readonly queue: Queue<IngestionJobData>,
  ) {}

  async enqueue(file: Express.Multer.File | undefined): Promise<string> {
    if (!file)
      throw new BadRequestException('Falta el archivo en el campo "file"');
    if (!(await hasPdfSignature(file.path))) {
      await rm(file.path, { force: true });
      throw new BadRequestException('El archivo no es un PDF válido');
    }

    const documentId = randomUUID();
    await this.queue.add(
      'ingest',
      {
        documentId,
        documentName: decodeFileName(file.originalname),
        filePath: file.path,
      },
      { jobId: documentId },
    );
    return documentId;
  }

  async getJob(id: string): Promise<JobView> {
    const job = await this.queue.getJob(id);
    if (!job) throw new NotFoundException(`No existe el trabajo ${id}`);
    return toView(job);
  }

  async listJobs(): Promise<JobView[]> {
    const jobs = await this.queue.getJobs([
      'waiting',
      'delayed',
      'prioritized',
      'active',
      'completed',
      'failed',
    ]);
    const views = await Promise.all(jobs.filter(Boolean).map(toView));
    return views.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
}

/** Solo se aceptan PDF: extensión y tipo MIME; la firma se comprueba después. */
export function isPdfUpload(
  file: Pick<Express.Multer.File, 'originalname' | 'mimetype'>,
): boolean {
  return (
    extname(decodeFileName(file.originalname)).toLowerCase() === '.pdf' &&
    file.mimetype === 'application/pdf'
  );
}

async function hasPdfSignature(path: string): Promise<boolean> {
  const handle = await open(path, 'r');
  try {
    const { buffer } = await handle.read(Buffer.alloc(5), 0, 5, 0);
    return buffer.toString('latin1') === '%PDF-';
  } finally {
    await handle.close();
  }
}

/** Multer entrega el nombre en latin1; se reinterpreta como UTF-8 (tildes, eñes). */
function decodeFileName(name: string): string {
  return Buffer.from(name, 'latin1').toString('utf8');
}

const STATUS_BY_STATE: Record<string, JobStatus> = {
  waiting: 'pending',
  delayed: 'pending',
  prioritized: 'pending',
  'waiting-children': 'pending',
  active: 'processing',
  completed: 'completed',
  failed: 'failed',
};

async function toView(job: Job<IngestionJobData>): Promise<JobView> {
  const status = STATUS_BY_STATE[await job.getState()] ?? 'pending';
  const progress = job.progress as IngestionProgress | number | undefined;
  const view: JobView = {
    id: job.id!,
    documentName: job.data.documentName,
    status,
    progress:
      status === 'completed'
        ? 100
        : typeof progress === 'object'
          ? progress.percent
          : 0,
    createdAt: new Date(job.timestamp).toISOString(),
  };
  // En un trabajo fallido, la etapa indica dónde falló.
  if (
    typeof progress === 'object' &&
    (status === 'processing' || status === 'failed')
  ) {
    view.stage = progress.stage;
  }
  if (status === 'failed') view.error = job.failedReason;
  return view;
}
