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
  if (!childId || !embedding?.length) return [];
  return searchAllChildren([childId], `[${embedding.join(',')}]`, limit);
}

/**
 * Cross-child search for global assistant.
 */
export async function searchAllChildren(

  childIds: string[],
  vectorStr: string,
  limit: number = 5
): Promise<string[]> {
  if (!childIds.length) return [];
  const rows = await query<TherapyNoteRow>(
    `SELECT note_text, child_id
     FROM therapy_embeddings
     WHERE child_id = ANY($1)
     ORDER BY embedding <-> $2::vector
     LIMIT $3`,
    [childIds, vectorStr, limit]
  );
  return rows.map((r) => r.note_text);
}

