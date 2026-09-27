import { randomUUID } from 'node:crypto';
import { QdrantClient } from '@qdrant/js-client-rest';
import {
  ChunkPayload,
  SearchResult,
  VectorPoint,
  VectorStore,
} from '../interfaces/vector-store.interface.js';

function hasStatus(error: unknown, status: number): boolean {
  return (error as { status?: number })?.status === status;
}

/**
 * Base vectorial sobre Qdrant. La colección se crea de forma perezosa en el
 * primer upsert, para que la API no dependa de Qdrant al arrancar.
 */
export class QdrantVectorStore implements VectorStore {
  private readonly client: QdrantClient;
  private collectionReady?: Promise<void>;

  constructor(
    url: string,
    private readonly collection: string,
    private readonly dimension: number,
  ) {
    this.client = new QdrantClient({ url, checkCompatibility: false });
  }

  async upsert(points: VectorPoint[]): Promise<void> {
    if (points.length === 0) return;
    await this.ensureCollection();
    await this.client.upsert(this.collection, {
      wait: true,
      points: points.map(({ vector, payload }) => ({
        id: randomUUID(),
        vector,
        payload: { ...payload },
      })),
    });
  }

  async search(vector: number[], limit: number): Promise<SearchResult[]> {
    try {
      const { points } = await this.client.query(this.collection, {
        query: vector,
        limit,
        with_payload: true,
      });
      return points.map(({ score, payload }) => ({
        score,
        payload: payload as unknown as ChunkPayload,
      }));
    } catch (error) {
      // Sin colección todavía no hay documentos indexados.
      if (hasStatus(error, 404)) return [];
      throw error;
    }
  }

  async isReady(): Promise<boolean> {
    try {
      await this.client.getCollections();
      return true;
    } catch {
      return false;
    }
  }

  private ensureCollection(): Promise<void> {
    // Se comparte la promesa para que ingestas simultáneas no creen la
    // colección dos veces; si falla, se descarta para reintentar.
    this.collectionReady ??= this.createCollection().catch((error) => {
      this.collectionReady = undefined;
      throw error;
    });
    return this.collectionReady;
  }

  private async createCollection(): Promise<void> {
    try {
      await this.client.createCollection(this.collection, {
        vectors: { size: this.dimension, distance: 'Cosine' },
      });
    } catch (error) {
      // Otra instancia o ingesta ya la creó.
      if (!hasStatus(error, 409)) throw error;
    }
    await this.checkDimension();
  }

  private async checkDimension(): Promise<void> {
    const info = await this.client.getCollection(this.collection);
    const vectors = info.config.params.vectors;
    const size =
      vectors && 'size' in vectors ? (vectors.size as number) : undefined;
    if (size !== this.dimension) {
      throw new Error(
        `La colección ${this.collection} tiene dimensión ${size} y el modelo ` +
          `de embeddings ${this.dimension}: elimina la colección y reindexa`,
      );
    }
  }
}
