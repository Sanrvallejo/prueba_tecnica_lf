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
   * chunk, las URLs relativas con las que se sirven. Una imagen asociada a
   * varios chunks se guarda una sola vez y comparte su URL.
   */
  async save(documentId: string, chunks: Chunk[]): Promise<string[][]> {
    const dir = join(IMAGES_DIR, documentId);
    await mkdir(dir, { recursive: true });

    const urlByContent = new Map<string, string>();
    const urls: string[][] = [];
    for (const chunk of chunks) {
      const chunkUrls: string[] = [];
      for (const image of chunk.images) {
        let url = urlByContent.get(image.base64);
        if (!url) {
          const ext = EXTENSIONS[image.mimeType] ?? 'png';
          const name = `p${image.page}-${urlByContent.size + 1}.${ext}`;
          await writeFile(join(dir, name), Buffer.from(image.base64, 'base64'));
          url = `${IMAGES_URL_PREFIX}/${documentId}/${name}`;
          urlByContent.set(image.base64, url);
        }
        chunkUrls.push(url);
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
