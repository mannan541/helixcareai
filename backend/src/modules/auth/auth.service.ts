import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query, queryOne } from '../../config/database';
import { env } from '../../config/env';
import { JwtPayload } from '../../middleware/auth';

const SALT_ROUNDS = 12;

export type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: string;
  title: string | null;
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  return queryOne<UserRow>(
    'SELECT id, email, password_hash, full_name, role, title FROM users WHERE email = $1 AND deleted_at IS NULL',
    [email.toLowerCase().trim()]
  );
}

export async function findUserById(id: string): Promise<Omit<UserRow, 'password_hash'> | null> {
  const row = await queryOne<UserRow>(
    'SELECT id, email, password_hash, full_name, role, title FROM users WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );
  if (!row) return null;
  const { password_hash: _, ...user } = row;
  return user;
}

export type UserListItem = { id: string; email: string; full_name: string; role: string; title: string | null };

export async function findUsers(opts: {
  role?: string;
  limit: number;
  offset: number;
  search?: string;
}): Promise<{ users: UserListItem[]; total: number }> {
  const { role, limit, offset, search } = opts;
  const conditions: string[] = [];
  const params: unknown[] = [];
  let i = 1;
  if (role) {
    conditions.push(`role = $${i++}`);
    params.push(role);
  }
  if (search && search.trim()) {
    conditions.push(`(email ILIKE $${i++} OR full_name ILIKE $${i++})`);
    const term = `%${search.trim()}%`;
    params.push(term, term);
  }
  conditions.push('deleted_at IS NULL');
  const where = `WHERE ${conditions.join(' AND ')}`;
  const countRows = await query<{ count: string }>(
    `SELECT COUNT(*)::text as count FROM users ${where}`,
    params
  );
  const total = parseInt(countRows[0]?.count ?? '0', 10);
  const limitIdx = params.length + 1;
  const offsetIdx = params.length + 2;
  const users = await query<{ id: string; email: string; full_name: string; role: string; title: string | null }>(
    `SELECT id, email, full_name, role, title FROM users ${where} ORDER BY full_name ASC LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    [...params, limit, offset]
  );
  return { users, total };
}

export async function createUser(
  email: string,
  password: string,
  fullName: string,
  role: string,
  title?: string | null
): Promise<{ id: string; email: string; full_name: string; role: string; title: string | null }> {
  const emailNorm = email.toLowerCase().trim();
  const hash = await hashPassword(password);
  const rows = await query<{ id: string; email: string; full_name: string; role: string; title: string | null }>(
    `INSERT INTO users (email, password_hash, full_name, role, title)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, email, full_name, role, title`,
    [emailNorm, hash, fullName.trim(), role, title ?? null]
  );
  return rows[0];
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions);
}

export async function updateUser(
  id: string,
  data: { fullName?: string; password?: string; title?: string | null }
): Promise<{ id: string; email: string; full_name: string; role: string; title: string | null } | null> {
  const updates: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (data.fullName !== undefined) {
    updates.push(`full_name = $${i++}`);
    values.push(data.fullName.trim());
  }
  if (data.password !== undefined && data.password.length > 0) {
    updates.push(`password_hash = $${i++}`);
    values.push(await hashPassword(data.password));
  }
  if (data.title !== undefined) {
    updates.push(`title = $${i++}`);
    values.push(data.title?.trim() ?? null);
  }
  if (updates.length === 0) return null;
  values.push(id);
  const rows = await query<{ id: string; email: string; full_name: string; role: string; title: string | null }>(
    `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${i}
     RETURNING id, email, full_name, role, title`,
    values
  );
  return rows[0] ?? null;
}
