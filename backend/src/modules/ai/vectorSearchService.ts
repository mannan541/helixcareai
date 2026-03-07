import { query } from '../../config/database';

export type TherapyNoteRow = {
  note_text: string;
};

/**
 * Find relevant therapy notes for a child by embedding similarity (L2 distance).
 * Uses therapy_embeddings table (384-dim vectors from all-MiniLM-L6-v2).
 */
export async function findRelevantNotes(
  childId: string,
  embedding: number[],
  limit: number = 5
): Promise<string[]> {
  if (!childId || !embedding?.length) {
    return [];
  }
  const vectorStr = `[${embedding.join(',')}]`;
  const rows = await query<TherapyNoteRow>(
    `SELECT note_text
     FROM therapy_embeddings
     WHERE child_id = $1
     ORDER BY embedding <-> $2::vector
     LIMIT $3`,
    [childId, vectorStr, limit]
  );
  return rows.map((r) => r.note_text);
}
