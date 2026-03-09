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
  approved_at: string | null;
  deleted_at: string | null;
  disabled_at: string | null;
  is_active: boolean;
  mobile_number: string | null;
  show_mobile_to_parents: boolean;
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Find user by email for login; returns user even if deleted/disabled so we can return the right error. */
export async function findUserByEmail(email: string): Promise<UserRow | null> {
  return queryOne<UserRow>(
    `SELECT id, email, password_hash, full_name, role, title, approved_at, deleted_at, disabled_at, is_active,
     COALESCE(mobile_number, NULL) AS mobile_number, COALESCE(show_mobile_to_parents, false) AS show_mobile_to_parents
     FROM users WHERE email = $1`,
    [email.toLowerCase().trim()]
  );
}

/** Returns true if user exists and is not deleted and not disabled (for auth middleware). */
export async function userCanAccess(userId: string): Promise<boolean> {
  const row = await queryOne<{ id: string }>(
    'SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL AND disabled_at IS NULL',
    [userId]
  );
  return row != null;
}

export async function findUserById(id: string): Promise<Omit<UserRow, 'password_hash'> | null> {
  const row = await queryOne<UserRow>(
    `SELECT id, email, password_hash, full_name, role, title, approved_at, deleted_at, disabled_at,
     mobile_number, COALESCE(show_mobile_to_parents, false) AS show_mobile_to_parents
     FROM users WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  );
  if (!row) return null;
  const { password_hash: _, ...user } = row;
  return user;
}

/** Find user by id including soft-deleted/disabled (for admin restore). */
export async function findUserByIdIncludingDeleted(id: string): Promise<Omit<UserRow, 'password_hash'> | null> {
  const row = await queryOne<UserRow>(
    `SELECT id, email, password_hash, full_name, role, title, approved_at, deleted_at, disabled_at,
     mobile_number, COALESCE(show_mobile_to_parents, false) AS show_mobile_to_parents
     FROM users WHERE id = $1`,
    [id]
  );
  if (!row) return null;
  const { password_hash: _, ...user } = row;
  return user;
}

/** Verify that the given password matches the user's stored hash (for profile password change). */
export async function verifyUserPassword(userId: string, password: string): Promise<boolean> {
  const row = await queryOne<Pick<UserRow, 'password_hash'>>(
    'SELECT password_hash FROM users WHERE id = $1 AND deleted_at IS NULL',
    [userId]
  );
  if (!row) return false;
  return verifyPassword(password, row.password_hash);
}

export type UserListItem = { id: string; email: string; full_name: string; role: string; title: string | null; approved_at: string | null; disabled_at: string | null; deleted_at: string | null; mobile_number: string | null; show_mobile_to_parents: boolean };

const SORT_COLUMNS = ['full_name', 'email', 'role', 'approved_at', 'disabled_at', 'deleted_at'] as const;
type SortColumn = (typeof SORT_COLUMNS)[number];
function orderClause(sortBy?: string, sortOrder?: string): string {
  const col = sortBy && SORT_COLUMNS.includes(sortBy as SortColumn) ? sortBy : 'full_name';
  const dir = sortOrder === 'desc' ? 'DESC' : 'ASC';
  return `ORDER BY ${col} ${dir} NULLS LAST`;
}

export async function findUsers(opts: {
  role?: string;
  limit: number;
  offset: number;
  search?: string;
  /** When true, only approved users; when false, only pending (approved_at IS NULL). Omit for all. */
  approved?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}): Promise<{ users: UserListItem[]; total: number }> {
  const { role, limit, offset, search, approved, sortBy, sortOrder } = opts;
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
  if (approved === true) conditions.push('approved_at IS NOT NULL');
  else if (approved === false) conditions.push('approved_at IS NULL');
  conditions.push('deleted_at IS NULL');
  const where = `WHERE ${conditions.join(' AND ')}`;
  const countRows = await query<{ count: string }>(
    `SELECT COUNT(*)::text as count FROM users ${where}`,
    params
  );
  const total = parseInt(countRows[0]?.count ?? '0', 10);
  const limitIdx = params.length + 1;
  const offsetIdx = params.length + 2;
  const users = await query<UserListItem>(
    `SELECT id, email, full_name, role, title, approved_at, disabled_at, NULL::timestamptz AS deleted_at, mobile_number, COALESCE(show_mobile_to_parents, false) AS show_mobile_to_parents FROM users ${where} ${orderClause(sortBy, sortOrder)} LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    [...params, limit, offset]
  );
  return { users, total };
}

/** List only archived users (soft-deleted or disabled). */
export async function findUsersArchived(opts: {
  role?: string;
  limit: number;
  offset: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}): Promise<{ users: UserListItem[]; total: number }> {
  const { role, limit, offset, search, sortBy, sortOrder } = opts;
  const conditions: string[] = ['(deleted_at IS NOT NULL OR disabled_at IS NOT NULL)'];
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
  const where = `WHERE ${conditions.join(' AND ')}`;
  const countRows = await query<{ count: string }>(
    `SELECT COUNT(*)::text as count FROM users ${where}`,
    params
  );
  const total = parseInt(countRows[0]?.count ?? '0', 10);
  const limitIdx = params.length + 1;
  const offsetIdx = params.length + 2;
  const users = await query<UserListItem>(
    `SELECT id, email, full_name, role, title, approved_at, disabled_at, deleted_at, mobile_number, COALESCE(show_mobile_to_parents, false) AS show_mobile_to_parents FROM users ${where} ${orderClause(sortBy, sortOrder)} LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    [...params, limit, offset]
  );
  return { users, total };
}

export async function createUser(
  email: string,
  password: string,
  fullName: string,
  role: string,
  title?: string | null,
  approved: boolean = false,
  mobileNumber?: string | null,
  showMobileToParents?: boolean
): Promise<{ id: string; email: string; full_name: string; role: string; title: string | null; mobile_number: string | null; show_mobile_to_parents: boolean }> {
  const emailNorm = email.toLowerCase().trim();
  const hash = await hashPassword(password);
  const approvedAt = approved ? new Date() : null;
  const show = showMobileToParents === true;
  const rows = await query<{ id: string; email: string; full_name: string; role: string; title: string | null; mobile_number: string | null; show_mobile_to_parents: boolean }>(
    `INSERT INTO users (email, password_hash, full_name, role, title, approved_at, mobile_number, show_mobile_to_parents)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, email, full_name, role, title, mobile_number, show_mobile_to_parents`,
    [emailNorm, hash, fullName.trim(), role, title ?? null, approvedAt, (mobileNumber ?? '').trim() || null, show]
  );
  return rows[0];
}

/** Set user as approved so they can sign in. Returns true if updated. */
export async function approveUser(id: string): Promise<boolean> {
  const result = await query(
    'UPDATE users SET approved_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL AND approved_at IS NULL RETURNING id',
    [id]
  );
  return result.length > 0;
}

/** Get IDs of all approved admin users (e.g. for broadcasting notifications). Excludes disabled/deleted. */
export async function getAdminUserIds(): Promise<string[]> {
  const rows = await query<{ id: string }>(
    "SELECT id FROM users WHERE role = 'admin' AND deleted_at IS NULL AND disabled_at IS NULL AND approved_at IS NOT NULL",
    []
  );
  return rows.map((r) => r.id);
}

/** Disable user (they cannot login; existing token will be rejected on next request). Returns true if updated. */
export async function disableUser(id: string): Promise<boolean> {
  const result = await query(
    'UPDATE users SET disabled_at = NOW(), is_active = false, updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL AND disabled_at IS NULL RETURNING id',
    [id]
  );
  return result.length > 0;
}

/** Re-enable a disabled user. Returns true if updated. */
export async function enableUser(id: string): Promise<boolean> {
  const result = await query(
    'UPDATE users SET disabled_at = NULL, is_active = true, updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL AND disabled_at IS NOT NULL RETURNING id',
    [id]
  );
  return result.length > 0;
}

/**
 * Reactivate a user that was previously soft-deleted and/or disabled when they attempt to sign up again.
 * Clears deleted/disabled flags and marks the account as active. Existing approval status is preserved.
 */
export async function reactivateUserForSignup(id: string): Promise<boolean> {
  const result = await query(
    'UPDATE users SET deleted_at = NULL, deleted_by = NULL, disabled_at = NULL, is_active = true, updated_at = NOW() WHERE id = $1 RETURNING id',
    [id]
  );
  return result.length > 0;
}

/** Soft-delete user (set deleted_at; they cannot login; existing token rejected). Children/therapy data remain. Returns true if updated. */
export async function deleteUser(id: string, deletedByUserId: string): Promise<boolean> {
  const result = await query(
    'UPDATE users SET deleted_at = NOW(), deleted_by = $1, is_active = false, updated_at = NOW() WHERE id = $2 AND deleted_at IS NULL RETURNING id',
    [deletedByUserId, id]
  );
  return result.length > 0;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions);
}

export async function updateUser(
  id: string,
  data: { fullName?: string; password?: string; title?: string | null; mobileNumber?: string | null; showMobileToParents?: boolean }
): Promise<{ id: string; email: string; full_name: string; role: string; title: string | null; mobile_number: string | null; show_mobile_to_parents: boolean } | null> {
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
  if (data.mobileNumber !== undefined) {
    updates.push(`mobile_number = $${i++}`);
    values.push((data.mobileNumber ?? '').trim() || null);
  }
  if (data.showMobileToParents !== undefined) {
    updates.push(`show_mobile_to_parents = $${i++}`);
    values.push(data.showMobileToParents === true);
  }
  if (updates.length === 0) return null;
  values.push(id);
  const rows = await query<{ id: string; email: string; full_name: string; role: string; title: string | null; mobile_number: string | null; show_mobile_to_parents: boolean }>(
    `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${i}
     RETURNING id, email, full_name, role, title, mobile_number, show_mobile_to_parents`,
    values
  );
  return rows[0] ?? null;
}
