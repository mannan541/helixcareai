import { query, queryOne } from '../../config/database';
import * as childrenService from '../children/children.service';

export type SessionRow = {
  id: string;
  child_id: string;
  created_by: string;
  session_date: string;
  duration_minutes: number | null;
  notes_text: string | null;
  structured_metrics: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export async function create(
  createdBy: string,
  data: {
    childId: string;
    sessionDate: string;
    durationMinutes?: number;
    notesText?: string;
    structuredMetrics?: Record<string, unknown>;
  }
): Promise<SessionRow> {
  const rows = await query<SessionRow>(
    `INSERT INTO sessions (child_id, created_by, session_date, duration_minutes, notes_text, structured_metrics)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      data.childId,
      createdBy,
      data.sessionDate,
      data.durationMinutes ?? null,
      data.notesText ?? null,
      JSON.stringify(data.structuredMetrics ?? {}),
    ]
  );
  return rows[0];
}

export async function findById(id: string): Promise<SessionRow | null> {
  return queryOne<SessionRow>('SELECT * FROM sessions WHERE id = $1', [id]);
}

export async function findByChildId(childId: string): Promise<SessionRow[]> {
  return query<SessionRow>(
    'SELECT * FROM sessions WHERE child_id = $1 ORDER BY session_date DESC, created_at DESC',
    [childId]
  );
}

export async function update(
  id: string,
  data: {
    sessionDate?: string;
    durationMinutes?: number;
    notesText?: string;
    structuredMetrics?: Record<string, unknown>;
  }
): Promise<SessionRow | null> {
  const updates: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (data.sessionDate !== undefined) {
    updates.push(`session_date = $${i++}`);
    values.push(data.sessionDate);
  }
  if (data.durationMinutes !== undefined) {
    updates.push(`duration_minutes = $${i++}`);
    values.push(data.durationMinutes);
  }
  if (data.notesText !== undefined) {
    updates.push(`notes_text = $${i++}`);
    values.push(data.notesText);
  }
  if (data.structuredMetrics !== undefined) {
    updates.push(`structured_metrics = $${i++}`);
    values.push(JSON.stringify(data.structuredMetrics));
  }
  if (updates.length === 0) return findById(id);
  values.push(id);
  const rows = await query<SessionRow>(
    `UPDATE sessions SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  return rows[0] ?? null;
}

export async function remove(id: string): Promise<boolean> {
  const result = await query<{ id: string }>('DELETE FROM sessions WHERE id = $1 RETURNING id', [id]);
  return result.length > 0;
}

export async function canAccessSession(
  sessionId: string,
  userId: string,
  role: string
): Promise<boolean> {
  const session = await findById(sessionId);
  if (!session) return false;
  if (role === 'admin') return true;
  const child = await childrenService.findById(session.child_id);
  if (!child) return false;
  return childrenService.canAccessChild(child.user_id, userId, role);
}
