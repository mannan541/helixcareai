import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { queryOne, query } from '../../config/database';
import { env } from '../../config/env';
import { JwtPayload } from '../../middleware/auth';

const SALT_ROUNDS = 12;

export type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: string;
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  return queryOne<UserRow>(
    'SELECT id, email, password_hash, full_name, role FROM users WHERE email = $1',
    [email.toLowerCase().trim()]
  );
}

export async function findUserById(id: string): Promise<Omit<UserRow, 'password_hash'> | null> {
  const row = await queryOne<UserRow>(
    'SELECT id, email, password_hash, full_name, role FROM users WHERE id = $1',
    [id]
  );
  if (!row) return null;
  const { password_hash: _, ...user } = row;
  return user;
}

export async function createUser(
  email: string,
  password: string,
  fullName: string,
  role: string
): Promise<{ id: string; email: string; full_name: string; role: string }> {
  const emailNorm = email.toLowerCase().trim();
  const hash = await hashPassword(password);
  const rows = await query<{ id: string; email: string; full_name: string; role: string }>(
    `INSERT INTO users (email, password_hash, full_name, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, full_name, role`,
    [emailNorm, hash, fullName.trim(), role]
  );
  return rows[0];
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions);
}
