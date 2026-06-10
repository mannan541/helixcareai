import { query } from '../../config/database';
import * as embeddingService from './embeddingService';
import { buildSessionEmbeddingText } from './sessionEmbeddingText';

export type SessionEmbeddingInput = {
  sessionDate: string;
  durationMinutes?: number | null;
  notesText?: string | null;
  structuredMetrics?: Record<string, unknown>;
};

/**
 * Generate embedding for session data and store in therapy_embeddings.
 * Embeds notes + structured metrics so AI can use performance data.
 */
export async function storeSessionData(
  sessionId: string,
  childId: string,
  data: SessionEmbeddingInput
): Promise<void> {
  const text = buildSessionEmbeddingText({
    session_date: data.sessionDate,
    duration_minutes: data.durationMinutes,
    notes_text: data.notesText,
    structured_metrics: data.structuredMetrics ?? {},
  });

  if (!text) {
    await query('DELETE FROM therapy_embeddings WHERE session_id = $1', [sessionId]);
    return;
  }

  try {
    const embedding = await embeddingService.generateEmbedding(text);
    const vectorStr = `[${embedding.join(',')}]`;
    await query('DELETE FROM therapy_embeddings WHERE session_id = $1', [sessionId]);
    await query(
      `INSERT INTO therapy_embeddings (child_id, session_id, note_text, embedding)
       VALUES ($1, $2, $3, $4::vector)`,
      [childId, sessionId, text, vectorStr]
    );
  } catch (err) {
    console.error('[therapyEmbeddingStorage] storeSessionData failed:', err);
    throw err;
  }
}

/** @deprecated Use storeSessionData */
export async function storeSessionNotes(
  sessionId: string,
  childId: string,
  noteText: string
): Promise<void> {
  return storeSessionData(sessionId, childId, { sessionDate: '', notesText: noteText });
}

type SessionRowForEmbed = {
  id: string;
  child_id: string;
  session_date: string;
  duration_minutes: number | null;
  notes_text: string | null;
  structured_metrics: Record<string, unknown>;
};

async function indexSessionRows(rows: SessionRowForEmbed[]): Promise<{ indexed: number; skipped: number }> {
  let indexed = 0;
  let skipped = 0;
  for (const row of rows) {
    const text = buildSessionEmbeddingText(row);
    if (!text) {
      await query('DELETE FROM therapy_embeddings WHERE session_id = $1', [row.id]);
      skipped++;
      continue;
    }
    await storeSessionData(row.id, row.child_id, {
      sessionDate: row.session_date,
      durationMinutes: row.duration_minutes,
      notesText: row.notes_text,
      structuredMetrics: row.structured_metrics,
    });
    indexed++;
  }
  return { indexed, skipped };
}

/**
 * Index only sessions missing from therapy_embeddings (or with empty index).
 */
export async function syncMissingSessionEmbeddings(
  childId: string
): Promise<{ synced: number; skipped: number }> {
  const rows = await query<SessionRowForEmbed>(
    `SELECT s.id, s.child_id, s.session_date, s.duration_minutes, s.notes_text, s.structured_metrics
     FROM sessions s
     LEFT JOIN therapy_embeddings te ON te.session_id = s.id
     WHERE s.child_id = $1 AND te.id IS NULL
     ORDER BY s.session_date ASC`,
    [childId]
  );
  const result = await indexSessionRows(rows);
  return { synced: result.indexed, skipped: result.skipped };
}

/**
 * Sync missing embeddings for every child that has unindexed sessions.
 */
export async function syncAllMissingSessionEmbeddings(): Promise<{
  children: number;
  synced: number;
  skipped: number;
}> {
  const childRows = await query<{ child_id: string }>(
    `SELECT DISTINCT s.child_id
     FROM sessions s
     LEFT JOIN therapy_embeddings te ON te.session_id = s.id
     WHERE te.id IS NULL`
  );

  let synced = 0;
  let skipped = 0;
  for (const { child_id } of childRows) {
    const result = await syncMissingSessionEmbeddings(child_id);
    synced += result.synced;
    skipped += result.skipped;
  }
  return { children: childRows.length, synced, skipped };
}

/**
 * Rebuild embeddings for all sessions of a child (e.g. after migration or backfill).
 */
export async function reindexChildSessions(childId: string): Promise<{ indexed: number; skipped: number }> {
  const rows = await query<SessionRowForEmbed>(
    `SELECT id, child_id, session_date, duration_minutes, notes_text, structured_metrics
     FROM sessions WHERE child_id = $1 ORDER BY session_date ASC`,
    [childId]
  );
  return indexSessionRows(rows);
}

/**
 * Full reindex for every child with sessions.
 */
export async function reindexAllChildren(): Promise<{
  children: number;
  indexed: number;
  skipped: number;
}> {
  const childRows = await query<{ id: string }>(
    `SELECT DISTINCT c.id
     FROM children c
     INNER JOIN sessions s ON s.child_id = c.id
     WHERE c.deleted_at IS NULL`
  );

  let indexed = 0;
  let skipped = 0;
  for (const { id } of childRows) {
    const result = await reindexChildSessions(id);
    indexed += result.indexed;
    skipped += result.skipped;
  }
  return { children: childRows.length, indexed, skipped };
}
