import { readFile } from 'node:fs/promises';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Agent, FormData, fetch } from 'undici';
import { UnstructuredElement } from './unstructured-element.interface.js';

// hi_res en CPU puede tardar varios minutos por documento.
const UNSTRUCTURED_TIMEOUT_MS = 20 * 60 * 1000;

@Injectable()
export class UnstructuredClient {
  private readonly url: string;
  private readonly dispatcher = new Agent({
    headersTimeout: UNSTRUCTURED_TIMEOUT_MS,
    bodyTimeout: UNSTRUCTURED_TIMEOUT_MS,
  });

  constructor(config: ConfigService) {
    this.url = config.get<string>(
      'UNSTRUCTURED_URL',
      'http://unstructured:8000',
    );
  }

  async partition(
    filePath: string,
    fileName: string,
  ): Promise<UnstructuredElement[]> {
    const form = new FormData();
    form.append(
      'files',
      new File([await readFile(filePath)], fileName, {
        type: 'application/pdf',
      }),
    );
    form.append('strategy', 'hi_res');
    form.append('coordinates', 'true');
    form.append('pdf_infer_table_structure', 'true');
    form.append('extract_image_block_types', '["Image"]');
    form.append('languages', 'spa');
    form.append('languages', 'eng');

    const response = await fetch(`${this.url}/general/v0/general`, {
      method: 'POST',
      body: form,
      headers: { accept: 'application/json' },
      dispatcher: this.dispatcher,
    });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 300);
      throw new Error(`Unstructured respondió ${response.status}: ${detail}`);
    }
    return (await response.json()) as UnstructuredElement[];
  }

  async isReady(): Promise<boolean> {
    try {
      const response = await fetch(`${this.url}/healthcheck`, {
        signal: AbortSignal.timeout(3000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
