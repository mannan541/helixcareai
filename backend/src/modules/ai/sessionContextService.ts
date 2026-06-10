import { query } from '../../config/database';
import { buildSessionEmbeddingText } from './sessionEmbeddingText';

export type SessionContextRow = {
  session_date: string;
  duration_minutes: number | null;
  notes_text: string | null;
  structured_metrics: Record<string, unknown>;
};

/**
 * Recent session summaries for RAG — ensures structured metrics reach the LLM
 * even when vector search misses or notes are sparse.
 */
export async function getRecentSessionSummaries(
  childId: string,
  limit: number = 8
): Promise<string[]> {
  const rows = await query<SessionContextRow>(
    `SELECT session_date, duration_minutes, notes_text, structured_metrics
     FROM sessions
     WHERE child_id = $1
     ORDER BY session_date DESC, created_at DESC
     LIMIT $2`,
    [childId, limit]
  );
  return rows.map((r) => buildSessionEmbeddingText(r)).filter((t) => t.length > 0);
}
