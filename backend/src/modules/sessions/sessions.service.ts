import { query, queryOne } from '../../config/database';
import * as childrenService from '../children/children.service';

const SESSION_NOT_DELETED = ' AND s.deleted_at IS NULL';

export type SessionRow = {
  id: string;
  child_id: string;
  created_by: string;
  therapist_id: string | null;
  session_date: string;
  duration_minutes: number | null;
  notes_text: string | null;
  structured_metrics: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  deleted_by: string | null;
  deleted_at: string | null;
};

export async function create(
  createdByUserId: string,
  data: {
    childId: string;
    sessionDate: string;
    therapistId?: string | null;
    durationMinutes?: number;
    notesText?: string;
    structuredMetrics?: Record<string, unknown>;
  }
): Promise<SessionRow> {
  const rows = await query<SessionRow>(
    `INSERT INTO sessions (child_id, created_by, therapist_id, session_date, duration_minutes, notes_text, structured_metrics)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      data.childId,
      createdByUserId,
      data.therapistId ?? null,
      data.sessionDate,
      data.durationMinutes ?? null,
      data.notesText ?? null,
      JSON.stringify(data.structuredMetrics ?? {}),
    ]
  );
  return rows[0];
}

const SESSION_COLS = 's.id, s.child_id, s.created_by, s.therapist_id, s.session_date, s.duration_minutes, s.notes_text, s.structured_metrics, s.created_at, s.updated_at, s.updated_by, s.deleted_by, s.deleted_at';
const CB_COLS = 'u_cb.id AS _cb_id, u_cb.full_name AS _cb_full_name, u_cb.email AS _cb_email, u_cb.title AS _cb_title';
const TH_COLS = 'u_th.id AS _th_id, u_th.full_name AS _th_full_name, u_th.email AS _th_email, u_th.title AS _th_title';
const UB_COLS = 'u_ub.id AS _ub_id, u_ub.full_name AS _ub_full_name, u_ub.email AS _ub_email';
const SESSION_JOIN_USERS = `FROM sessions s
  LEFT JOIN users u_cb ON s.created_by = u_cb.id
  LEFT JOIN users u_th ON s.therapist_id = u_th.id
  LEFT JOIN users u_ub ON s.updated_by = u_ub.id`;

export type SessionWithUserRow = SessionRow & {
  _cb_id: string | null;
  _cb_full_name: string | null;
  _cb_email: string | null;
  _cb_title: string | null;
  _th_id: string | null;
  _th_full_name: string | null;
  _th_email: string | null;
  _th_title: string | null;
  _ub_id: string | null;
  _ub_full_name: string | null;
  _ub_email: string | null;
};

export async function findById(id: string): Promise<SessionRow | null> {
  return queryOne<SessionRow>('SELECT * FROM sessions WHERE id = $1 AND deleted_at IS NULL', [id]);
}

export async function findByIdWithUser(id: string): Promise<SessionWithUserRow | null> {
  const rows = await query<SessionWithUserRow>(
    `SELECT ${SESSION_COLS}, ${CB_COLS}, ${TH_COLS}, ${UB_COLS} ${SESSION_JOIN_USERS} WHERE s.id = $1${SESSION_NOT_DELETED}`,
    [id]
  );
  return rows[0] ?? null;
}

export async function findByChildId(
  childId: string,
  opts?: { limit: number; offset: number }
): Promise<{ rows: SessionRow[]; total: number }> {
  const limit = opts ? Math.min(Math.max(opts.limit, 1), 100) : 9999;
  const offset = opts ? Math.max(opts.offset, 0) : 0;
  const countRows = await query<{ count: string }>(
    'SELECT COUNT(*)::text as count FROM sessions WHERE child_id = $1 AND deleted_at IS NULL',
    [childId]
  );
  const total = parseInt(countRows[0]?.count ?? '0', 10);
  const rows = await query<SessionRow>(
    'SELECT * FROM sessions WHERE child_id = $1 AND deleted_at IS NULL ORDER BY session_date DESC, created_at DESC LIMIT $2 OFFSET $3',
    [childId, limit, offset]
  );
  return { rows, total };
}

export async function findByChildIdWithUser(
  childId: string,
  opts?: { limit: number; offset: number }
): Promise<{ rows: SessionWithUserRow[]; total: number }> {
  const limit = opts ? Math.min(Math.max(opts.limit, 1), 100) : 9999;
  const offset = opts ? Math.max(opts.offset, 0) : 0;
  const countRows = await query<{ count: string }>(
    `SELECT COUNT(*)::text as count FROM sessions s WHERE s.child_id = $1${SESSION_NOT_DELETED}`,
    [childId]
  );
  const total = parseInt(countRows[0]?.count ?? '0', 10);
  const rows = await query<SessionWithUserRow>(
    `SELECT ${SESSION_COLS}, ${CB_COLS}, ${TH_COLS}, ${UB_COLS} ${SESSION_JOIN_USERS} WHERE s.child_id = $1${SESSION_NOT_DELETED} ORDER BY s.session_date DESC, s.created_at DESC LIMIT $2 OFFSET $3`,
    [childId, limit, offset]
  );
  return { rows, total };
}

export async function update(
  id: string,
  data: {
    updatedBy?: string;
    therapistId?: string | null;
    sessionDate?: string;
    durationMinutes?: number;
    notesText?: string;
    structuredMetrics?: Record<string, unknown>;
  }
): Promise<SessionRow | null> {
  const updates: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (data.updatedBy !== undefined) {
    updates.push(`updated_by = $${i++}`);
    values.push(data.updatedBy);
  }
  if (data.therapistId !== undefined) {
    updates.push(`therapist_id = $${i++}`);
    values.push(data.therapistId);
  }
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
    `UPDATE sessions SET ${updates.join(', ')} WHERE id = $${i} AND deleted_at IS NULL RETURNING *`,
    values
  );
  return rows[0] ?? null;
}

export async function remove(id: string, deletedByUserId: string): Promise<boolean> {
  const result = await query<{ id: string }>(
    'UPDATE sessions SET deleted_by = $1, deleted_at = NOW() WHERE id = $2 AND deleted_at IS NULL RETURNING id',
    [deletedByUserId, id]
  );
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

// ---------- Session comments ----------
export type SessionCommentRow = {
  id: string;
  session_id: string;
  user_id: string;
  comment: string;
  created_at: string;
};

export type SessionCommentWithUserRow = SessionCommentRow & {
  _u_id: string;
  _u_full_name: string;
  _u_email: string;
};

export async function addSessionComment(
  sessionId: string,
  userId: string,
  comment: string
): Promise<SessionCommentWithUserRow> {
  const rows = await query<SessionCommentRow>(
    `INSERT INTO session_comments (session_id, user_id, comment) VALUES ($1, $2, $3) RETURNING *`,
    [sessionId, userId, comment]
  );
  const row = rows[0];
  const userRows = await query<{ id: string; full_name: string; email: string }>(
    'SELECT id, full_name, email FROM users WHERE id = $1',
    [userId]
  );
  const u = userRows[0];
  return {
    ...row,
    _u_id: u?.id ?? userId,
    _u_full_name: u?.full_name ?? '',
    _u_email: u?.email ?? '',
  };
}

export async function listSessionComments(sessionId: string): Promise<SessionCommentWithUserRow[]> {
  const rows = await query<SessionCommentWithUserRow>(
    `SELECT c.id, c.session_id, c.user_id, c.comment, c.created_at,
       u.id AS _u_id, u.full_name AS _u_full_name, u.email AS _u_email
     FROM session_comments c
     JOIN users u ON c.user_id = u.id
     WHERE c.session_id = $1 AND c.deleted_at IS NULL ORDER BY c.created_at ASC`,
    [sessionId]
  );
  return rows;
}
