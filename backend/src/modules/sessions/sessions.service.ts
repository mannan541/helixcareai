import { query, queryOne } from '../../config/database';
import * as childrenService from '../children/children.service';
import * as therapyEmbeddingStorage from '../ai/therapyEmbeddingStorage';

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
  const session = rows[0];
  therapyEmbeddingStorage.storeSessionNotes(session.id, session.child_id, session.notes_text ?? '').catch((err) =>
    console.error('[sessions] therapy_embeddings sync failed:', err)
  );
  return session;
}

const SESSION_COLS = 's.id, s.child_id, s.created_by, s.therapist_id, s.session_date, s.duration_minutes, s.notes_text, s.structured_metrics, s.created_at, s.updated_at, s.updated_by, s.deleted_by, s.deleted_at';
const CB_COLS = 'u_cb.id AS _cb_id, u_cb.full_name AS _cb_full_name, u_cb.email AS _cb_email, u_cb.title AS _cb_title';
const TH_COLS = 'u_th.id AS _th_id, u_th.full_name AS _th_full_name, u_th.email AS _th_email, u_th.title AS _th_title, u_th.mobile_number AS _th_mobile_number, COALESCE(u_th.show_mobile_to_parents, false) AS _th_show_mobile_to_parents';
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
  _th_mobile_number: string | null;
  _th_show_mobile_to_parents: boolean;
  _ub_id: string | null;
  _ub_full_name: string | null;
  _ub_email: string | null;
};

export async function findById(id: string): Promise<SessionRow | null> {
  return queryOne<SessionRow>('SELECT * FROM sessions WHERE id = $1 AND deleted_at IS NULL', [id]);
}

type UserInfoRow = { id: string; full_name: string; email: string; title: string | null };

async function findUserByIdForSession(userId: string): Promise<UserInfoRow | null> {
  const rows = await query<UserInfoRow>(
    'SELECT id, full_name, email, title FROM users WHERE id = $1',
    [userId]
  );
  return rows[0] ?? null;
}

function fillTherapistFromUser(row: SessionWithUserRow, u: UserInfoRow): void {
  (row as Record<string, unknown>)._th_id = u.id;
  (row as Record<string, unknown>)._th_full_name = u.full_name;
  (row as Record<string, unknown>)._th_email = u.email;
  (row as Record<string, unknown>)._th_title = u.title;
}

export async function findByIdWithUser(id: string): Promise<SessionWithUserRow | null> {
  const rows = await query<SessionWithUserRow>(
    `SELECT ${SESSION_COLS}, ${CB_COLS}, ${TH_COLS}, ${UB_COLS} ${SESSION_JOIN_USERS} WHERE s.id = $1${SESSION_NOT_DELETED}`,
    [id]
  );
  const row = rows[0] ?? null;
  if (row && row.therapist_id && row._th_id == null) {
    const u = await findUserByIdForSession(row.therapist_id);
    if (u) fillTherapistFromUser(row, u);
  }
  return row;
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
  const missingTherapistIds = [...new Set(rows.filter((r) => r.therapist_id && r._th_id == null).map((r) => r.therapist_id!))];
  if (missingTherapistIds.length > 0) {
    const userRows = await query<UserInfoRow>(
      'SELECT id, full_name, email, title FROM users WHERE id = ANY($1)',
      [missingTherapistIds]
    );
    const byId = new Map(userRows.map((u) => [u.id, u]));
    for (const row of rows) {
      if (row.therapist_id && row._th_id == null) {
        const u = byId.get(row.therapist_id);
        if (u) fillTherapistFromUser(row, u);
      }
    }
  }
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
  const updated = rows[0] ?? null;
  if (updated) {
    therapyEmbeddingStorage.storeSessionNotes(updated.id, updated.child_id, updated.notes_text ?? '').catch((err) =>
      console.error('[sessions] therapy_embeddings sync failed:', err)
    );
  }
  return updated;
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

/** Count of sessions where this user is the assigned therapist (for therapist dashboard). */
export async function countByTherapistId(therapistId: string): Promise<number> {
  const rows = await query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM sessions WHERE therapist_id = $1 AND deleted_at IS NULL',
    [therapistId]
  );
  return parseInt(rows[0]?.count ?? '0', 10);
}

/** Count of sessions for children owned by this parent (for parent dashboard). */
export async function countForParentUserId(parentUserId: string): Promise<number> {
  const rows = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM sessions s
     INNER JOIN children c ON s.child_id = c.id
     WHERE c.user_id = $1 AND c.deleted_at IS NULL AND s.deleted_at IS NULL`,
    [parentUserId]
  );
  return parseInt(rows[0]?.count ?? '0', 10);
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

export async function findCommentById(commentId: string): Promise<SessionCommentRow | null> {
  const rows = await query<SessionCommentRow>(
    'SELECT id, session_id, user_id, comment, created_at FROM session_comments WHERE id = $1 AND deleted_at IS NULL',
    [commentId]
  );
  return rows[0] ?? null;
}

/** Update a comment. Only the comment author can update. Returns updated comment with user info or null. */
export async function updateSessionComment(
  commentId: string,
  userId: string,
  comment: string
): Promise<SessionCommentWithUserRow | null> {
  const existing = await findCommentById(commentId);
  if (!existing || existing.user_id !== userId) return null;
  const rows = await query<SessionCommentRow>(
    `UPDATE session_comments SET comment = $1, updated_at = NOW(), updated_by = $2 WHERE id = $3 AND deleted_at IS NULL RETURNING *`,
    [comment.trim(), userId, commentId]
  );
  const row = rows[0];
  if (!row) return null;
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

/** Soft-delete a comment. Only the comment author can delete. Returns true if deleted. */
export async function deleteSessionComment(commentId: string, userId: string): Promise<boolean> {
  const existing = await findCommentById(commentId);
  if (!existing || existing.user_id !== userId) return false;
  const result = await query(
    'UPDATE session_comments SET deleted_at = NOW(), deleted_by = $1 WHERE id = $2 AND deleted_at IS NULL RETURNING id',
    [userId, commentId]
  );
  return result.length > 0;
}
