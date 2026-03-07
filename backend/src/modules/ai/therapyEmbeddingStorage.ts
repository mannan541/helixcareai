import { query } from '../../config/database';
import * as embeddingService from './embeddingService';

/**
 * Generate embedding for session notes and store in therapy_embeddings.
 * Call after session create/update when notes_text is present.
 * Safe to call in fire-and-forget; logs errors without throwing.
 */
export async function storeSessionNotes(
  sessionId: string,
  childId: string,
  noteText: string
): Promise<void> {
  const trimmed = noteText?.trim();
  if (!trimmed) {
    await query('DELETE FROM therapy_embeddings WHERE session_id = $1', [sessionId]);
    return;
  }
  try {
    const embedding = await embeddingService.generateEmbedding(trimmed);
    const vectorStr = `[${embedding.join(',')}]`;
    await query(
      'DELETE FROM therapy_embeddings WHERE session_id = $1',
      [sessionId]
    );
    await query(
      `INSERT INTO therapy_embeddings (child_id, session_id, note_text, embedding)
       VALUES ($1, $2, $3, $4::vector)`,
      [childId, sessionId, trimmed, vectorStr]
    );
  } catch (err) {
    console.error('[therapyEmbeddingStorage] storeSessionNotes failed:', err);
    throw err;
  }
}
