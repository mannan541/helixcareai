import { query, queryOne } from '../../config/database';

export type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
  meta: Record<string, unknown>;
};

export type NotificationType =
  | 'signup_pending_approval'    // to admin
  | 'session_logged_for_parent'  // to parent: new session for their child
  | 'session_logged_by_admin'    // to therapist: admin logged a session
  | 'parent_comment_on_session'; // to therapist + admins: parent added note on session

/** Create a single notification for a user. */
export async function create(
  userId: string,
  type: NotificationType,
  title: string,
  body: string | null = null,
  meta: Record<string, unknown> = {}
): Promise<NotificationRow> {
  const rows = await query<NotificationRow>(
    `INSERT INTO notifications (user_id, type, title, body, meta)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, user_id, type, title, body, read_at, created_at, meta`,
    [userId, type, title, body ?? null, JSON.stringify(meta)]
  );
  return rows[0];
}

/** Create the same notification for multiple users (e.g. all admins). */
export async function createForUsers(
  userIds: string[],
  type: NotificationType,
  title: string,
  body: string | null = null,
  meta: Record<string, unknown> = {}
): Promise<void> {
  if (userIds.length === 0) return;
  for (const uid of userIds) {
    await create(uid, type, title, body, meta);
  }
}

export async function listByUserId(
  userId: string,
  opts: { limit?: number; offset?: number; unreadOnly?: boolean }
): Promise<{ notifications: NotificationRow[]; total: number }> {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 100);
  const offset = Math.max(opts.offset ?? 0, 0);
  const unreadOnly = opts.unreadOnly === true;
  const conditions = ['user_id = $1'];
  const params: unknown[] = [userId];
  if (unreadOnly) {
    conditions.push('read_at IS NULL');
  }
  const where = `WHERE ${conditions.join(' AND ')}`;
  const countRows = await query<{ count: string }>(
    `SELECT COUNT(*)::text as count FROM notifications ${where}`,
    params
  );
  const total = parseInt(countRows[0]?.count ?? '0', 10);
  const rows = await query<NotificationRow>(
    `SELECT id, user_id, type, title, body, read_at, created_at, meta
     FROM notifications ${where}
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [...params, limit, offset]
  );
  return { notifications: rows, total };
}

export async function getUnreadCount(userId: string): Promise<number> {
  const rows = await query<{ count: string }>(
    'SELECT COUNT(*)::text as count FROM notifications WHERE user_id = $1 AND read_at IS NULL',
    [userId]
  );
  return parseInt(rows[0]?.count ?? '0', 10);
}

export async function markAsRead(id: string, userId: string): Promise<boolean> {
  const result = await query(
    'UPDATE notifications SET read_at = NOW() WHERE id = $1 AND user_id = $2 AND read_at IS NULL RETURNING id',
    [id, userId]
  );
  return result.length > 0;
}

export async function markAllAsRead(userId: string): Promise<number> {
  const result = await query<{ id: string }>(
    'UPDATE notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL RETURNING id',
    [userId]
  );
  return result.length;
}

export async function findById(id: string, userId: string): Promise<NotificationRow | null> {
  return queryOne<NotificationRow>(
    'SELECT id, user_id, type, title, body, read_at, created_at, meta FROM notifications WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
}
