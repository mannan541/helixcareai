import { Pool } from 'pg';
import { env } from './env';

// Longer timeout for remote DBs (e.g. Neon); 2s was too short and caused "Connection terminated due to connection timeout"
const connectionTimeoutMillis = typeof process.env.CONNECTION_TIMEOUT_MS === 'string'
  ? parseInt(process.env.CONNECTION_TIMEOUT_MS, 10) || 15000
  : 15000;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis,
});

export async function query<T = unknown>(text: string, params?: unknown[]): Promise<T[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return (result.rows as T[]) ?? [];
  } finally {
    client.release();
  }
}

export async function queryOne<T = unknown>(text: string, params?: unknown[]): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
