export const INGESTION_QUEUE = 'ingestion';

export interface IngestionJobData {
  documentId: string;
  documentName: string;
  filePath: string;
}

export type IngestionStage =
  'extracting' | 'chunking' | 'embedding' | 'indexing';

export interface IngestionProgress {
  stage: IngestionStage;
  percent: number;
}

export interface IngestionResult {
  chunks: number;
  images: number;
}

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

/** Estado de un documento tal como lo ve el frontend. */
export interface JobView {
  id: string;
  documentName: string;
  status: JobStatus;
  stage?: IngestionStage;
  progress: number;
  error?: string;
  createdAt: string;
}
