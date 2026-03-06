import { query, queryOne } from '../../config/database';

const NOT_DELETED = ' AND deleted_at IS NULL';

export type ChildRow = {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  notes: string | null;
  diagnosis: string | null;
  referred_by: string | null;
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
  deleted_by: string | null;
  deleted_at: string | null;
};

export async function create(
  userId: string,
  data: { firstName: string; lastName: string; dateOfBirth?: string; notes?: string; diagnosis?: string; referredBy?: string }
): Promise<ChildRow> {
  const rows = await query<ChildRow>(
    `INSERT INTO children (user_id, first_name, last_name, date_of_birth, notes, diagnosis, referred_by, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      userId,
      data.firstName.trim(),
      data.lastName.trim(),
      data.dateOfBirth ?? null,
      data.notes ?? null,
      data.diagnosis?.trim() ?? null,
      data.referredBy?.trim() ?? null,
      userId,
    ]
  );
  return rows[0];
}

export async function findById(id: string): Promise<ChildRow | null> {
  return queryOne<ChildRow>(`SELECT * FROM children WHERE id = $1${NOT_DELETED}`, [id]);
}

export async function findByUserId(
  userId: string,
  role: string,
  opts?: { limit: number; offset: number }
): Promise<{ rows: ChildRow[]; total: number }> {
  const limit = opts ? Math.min(Math.max(opts.limit, 1), 100) : 9999;
  const offset = opts ? Math.max(opts.offset, 0) : 0;
  const isAdmin = role === 'admin';
  const where = isAdmin ? `WHERE deleted_at IS NULL` : 'WHERE user_id = $1 AND deleted_at IS NULL';
  const countParams = isAdmin ? [] : [userId];
  const countRows = await query<{ count: string }>(
    `SELECT COUNT(*)::text as count FROM children ${where}`,
    countParams
  );
  const total = parseInt(countRows[0]?.count ?? '0', 10);
  const params = isAdmin ? [limit, offset] : [userId, limit, offset];
  const orderLimit = isAdmin
    ? 'ORDER BY created_at DESC LIMIT $1 OFFSET $2'
    : 'ORDER BY created_at DESC LIMIT $2 OFFSET $3';
  const rows = await query<ChildRow>(
    `SELECT * FROM children ${where} ${orderLimit}`,
    params
  );
  return { rows, total };
}

export async function update(
  id: string,
  data: { updatedBy?: string; firstName?: string; lastName?: string; dateOfBirth?: string; notes?: string; diagnosis?: string; referredBy?: string }
): Promise<ChildRow | null> {
  const updates: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (data.updatedBy !== undefined) {
    updates.push(`updated_by = $${i++}`);
    values.push(data.updatedBy);
  }
  if (data.firstName !== undefined) {
    updates.push(`first_name = $${i++}`);
    values.push(data.firstName.trim());
  }
  if (data.lastName !== undefined) {
    updates.push(`last_name = $${i++}`);
    values.push(data.lastName.trim());
  }
  if (data.dateOfBirth !== undefined) {
    updates.push(`date_of_birth = $${i++}`);
    values.push(data.dateOfBirth || null);
  }
  if (data.notes !== undefined) {
    updates.push(`notes = $${i++}`);
    values.push(data.notes);
  }
  if (data.diagnosis !== undefined) {
    updates.push(`diagnosis = $${i++}`);
    values.push(data.diagnosis?.trim() ?? null);
  }
  if (data.referredBy !== undefined) {
    updates.push(`referred_by = $${i++}`);
    values.push(data.referredBy?.trim() ?? null);
  }
  if (updates.length === 0) return findById(id);
  values.push(id);
  const rows = await query<ChildRow>(
    `UPDATE children SET ${updates.join(', ')} WHERE id = $${i} AND deleted_at IS NULL RETURNING *`,
    values
  );
  return rows[0] ?? null;
}

export async function remove(id: string, deletedByUserId: string): Promise<boolean> {
  const result = await query<{ id: string }>(
    `UPDATE children SET deleted_by = $1, deleted_at = NOW() WHERE id = $2 AND deleted_at IS NULL RETURNING id`,
    [deletedByUserId, id]
  );
  return result.length > 0;
}

export async function assignChildrenToUser(childIds: string[], userId: string): Promise<void> {
  if (childIds.length === 0) return;
  for (const childId of childIds) {
    await query('UPDATE children SET user_id = $1, updated_by = $2, updated_at = NOW() WHERE id = $3 AND deleted_at IS NULL', [userId, userId, childId]);
  }
}

export function canAccessChild(childUserId: string, requestUserId: string, role: string): boolean {
  if (role === 'admin') return true;
  return childUserId === requestUserId;
}
