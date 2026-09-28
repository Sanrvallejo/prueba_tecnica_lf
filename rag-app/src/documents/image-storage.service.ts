import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Injectable } from '@nestjs/common';
import { Chunk } from './interfaces/chunk.interface.js';

/** Carpeta de imágenes extraídas; en Docker es un volumen. */
export const IMAGES_DIR = join(process.cwd(), 'storage', 'images');
/** Prefijo con el que se sirven como archivos estáticos. */
export const IMAGES_URL_PREFIX = '/images';

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

@Injectable()
export class ImageStorageService {
  /**
   * Guarda en disco las imágenes asociadas a cada chunk y devuelve, por
   * chunk, las URLs relativas con las que se sirven.
   */
  async save(documentId: string, chunks: Chunk[]): Promise<string[][]> {
    const dir = join(IMAGES_DIR, documentId);
    await mkdir(dir, { recursive: true });

    let index = 0;
    const urls: string[][] = [];
    for (const chunk of chunks) {
      const chunkUrls: string[] = [];
      for (const image of chunk.images) {
        const ext = EXTENSIONS[image.mimeType] ?? 'png';
        const name = `p${image.page}-${++index}.${ext}`;
        await writeFile(join(dir, name), Buffer.from(image.base64, 'base64'));
        chunkUrls.push(`${IMAGES_URL_PREFIX}/${documentId}/${name}`);
      }
      urls.push(chunkUrls);
    }
    return urls;
  }

  /** Borra las imágenes de un documento (por ejemplo, si su ingesta falla). */
  async remove(documentId: string): Promise<void> {
    await rm(join(IMAGES_DIR, documentId), { recursive: true, force: true });
  }
}
