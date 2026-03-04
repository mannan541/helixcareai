import { query, queryOne } from '../../config/database';

export type ChildRow = {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export async function create(
  userId: string,
  data: { firstName: string; lastName: string; dateOfBirth?: string; notes?: string }
): Promise<ChildRow> {
  const rows = await query<ChildRow>(
    `INSERT INTO children (user_id, first_name, last_name, date_of_birth, notes)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      userId,
      data.firstName.trim(),
      data.lastName.trim(),
      data.dateOfBirth ?? null,
      data.notes ?? null,
    ]
  );
  return rows[0];
}

export async function findById(id: string): Promise<ChildRow | null> {
  return queryOne<ChildRow>('SELECT * FROM children WHERE id = $1', [id]);
}

export async function findByUserId(userId: string, role: string): Promise<ChildRow[]> {
  if (role === 'admin') {
    return query<ChildRow>('SELECT * FROM children ORDER BY created_at DESC');
  }
  return query<ChildRow>(
    'SELECT * FROM children WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
}

export async function update(
  id: string,
  data: { firstName?: string; lastName?: string; dateOfBirth?: string; notes?: string }
): Promise<ChildRow | null> {
  const updates: string[] = [];
  const values: unknown[] = [];
  let i = 1;
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
  if (updates.length === 0) return findById(id);
  values.push(id);
  const rows = await query<ChildRow>(
    `UPDATE children SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  return rows[0] ?? null;
}

export async function remove(id: string): Promise<boolean> {
  const result = await query<{ id: string }>('DELETE FROM children WHERE id = $1 RETURNING id', [id]);
  return result.length > 0;
}

export function canAccessChild(childUserId: string, requestUserId: string, role: string): boolean {
  if (role === 'admin') return true;
  return childUserId === requestUserId;
}
