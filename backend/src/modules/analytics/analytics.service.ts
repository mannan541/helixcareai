import { query } from '../../config/database';
import * as childrenService from '../children/children.service';

export type SessionMetricRow = {
  id: string;
  session_date: string;
  duration_minutes: number | null;
  structured_metrics: Record<string, unknown>;
};

export async function getSessionMetricsForChild(
  childId: string,
  userId: string,
  role: string
): Promise<SessionMetricRow[]> {
  const child = await childrenService.findById(childId);
  if (!child) return [];
  if (!childrenService.canAccessChild(child.user_id, userId, role)) return [];
  return query<SessionMetricRow>(
    `SELECT id, session_date, duration_minutes, structured_metrics
     FROM sessions WHERE child_id = $1 ORDER BY session_date ASC`,
    [childId]
  );
}
