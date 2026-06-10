import { Pool, types } from 'pg';
import { env } from './env';

// 1082 is the OID for DATE in Postgres.
// We set this type parser to return the string as-is, avoiding the default behavior 
// of converting it to a JavaScript Date object which then gets ISO-stringified 
// with a potential timezone shift (e.g. 2024-03-05 becomes 2024-03-04T19:00:00Z).
types.setTypeParser(1082, (val) => val);

// Longer timeout for remote DBs (e.g. Neon); cold starts can take 10s+ and caused
// "Connection terminated due to connection timeout"
const connectionTimeoutMillis = typeof process.env.CONNECTION_TIMEOUT_MS === 'string'
  ? parseInt(process.env.CONNECTION_TIMEOUT_MS, 10) || 30000
  : 30000;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis,
  keepAlive: true,
});

function isConnectionTimeout(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes('Connection terminated due to connection timeout') || msg.includes('timeout exceeded when trying to connect');
}

export async function query<T = unknown>(text: string, params?: unknown[]): Promise<T[]> {
  // Retry once on connection timeout — remote serverless DBs (Neon) suspend when
  // idle and the first connection after a cold start can time out.
  for (let attempt = 0; ; attempt++) {
    let client;
    try {
      client = await pool.connect();
    } catch (err) {
      if (attempt === 0 && isConnectionTimeout(err)) {
        console.warn('[db] connection timeout (cold start?), retrying once...');
        continue;
      }
      throw err;
    }
    try {
      const result = await client.query(text, params);
      return (result.rows as T[]) ?? [];
    } finally {
      client.release();
    }
  }
}

export async function queryOne<T = unknown>(text: string, params?: unknown[]): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
