import { query } from '../../config/database';

/**
 * Append-only audit log for compliance (who disabled/deleted whom, when).
 * Kept for data integrity and healthcare-like retention.
 */
export async function log(params: {
  action: string;
  userId?: string | null;
  adminId?: string | null;
  details?: Record<string, unknown> | null;
}): Promise<void> {
  const { action, userId, adminId, details } = params;
  await query(
    `INSERT INTO audit_logs (action, user_id, admin_id, details)
     VALUES ($1, $2, $3, $4::jsonb)`,
    [action, userId ?? null, adminId ?? null, details ? JSON.stringify(details) : null]
  );
}
