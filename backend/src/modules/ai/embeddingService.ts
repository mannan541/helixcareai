import axios, { AxiosError } from 'axios';
import { env } from '../../config/env';

const EMBED_URL = `${env.EMBEDDING_SERVICE_URL.replace(/\/$/, '')}/embed`;

/**
 * Generate embedding for text using the local Python embedding service
 * (sentence-transformers all-MiniLM-L6-v2, 384 dimensions).
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error('Text cannot be empty');
  }
  try {
    const { data } = await axios.post<{ embedding: number[] }>(EMBED_URL, { text: trimmed }, {
      timeout: 60_000,
      headers: { 'Content-Type': 'application/json' },
      validateStatus: () => true,
    });
    if (!data?.embedding || !Array.isArray(data.embedding)) {
      throw new Error('Invalid embedding response: missing or invalid embedding array');
    }
    if (data.embedding.length !== 384) {
      throw new Error(`Unexpected embedding dimension: ${data.embedding.length}, expected 384`);
    }
    return data.embedding;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const e = err as AxiosError<{ detail?: string }>;
      const message = e.response?.data?.detail ?? e.message ?? 'Embedding service request failed';
      const status = e.response?.status;
      const error = new Error(message) as Error & { statusCode?: number };
      error.statusCode = status ?? 502;
      throw error;
    }
    throw err;
  }
}
