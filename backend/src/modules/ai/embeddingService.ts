import { GoogleGenAI } from '@google/genai';
import { env } from '../../config/env';

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  if (!client) {
    if (!env.GEMINI_API_KEY) {
      throw new Error('Gemini is not configured. Set GEMINI_API_KEY for cloud embeddings.');
    }
    client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  }
  return client;
}

/**
 * Generate embedding for text using Google Gemini cloud service.
 * Defaults to text-embedding-004 (768 dimensions).
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error('Text cannot be empty');
  }

  try {
    const ai = getClient();
    const result = await ai.models.embedContent({
      model: env.GEMINI_EMBEDDING_MODEL,
      contents: [{ parts: [{ text: trimmed }] }],
    });
    const embedding = result.embeddings?.[0]?.values;

    if (!embedding || !Array.isArray(embedding)) {
      throw new Error('Invalid embedding response from Gemini');
    }

    if (embedding.length !== env.EMBEDDING_DIMENSION) {
      console.warn(`[embeddingService] Dimension mismatch: Got ${embedding.length}, expected ${env.EMBEDDING_DIMENSION}`);
    }

    return Array.from(embedding);
  } catch (err: any) {
    console.error('[embeddingService] Gemini error:', err.message);
    const error = new Error(err.message ?? 'Embedding failed') as Error & { statusCode?: number };
    error.statusCode = 502;
    throw error;
  }
}
