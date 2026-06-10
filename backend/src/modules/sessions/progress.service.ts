import { query } from '../../config/database';

function metricNum(metrics: Record<string, unknown>, key: string): number | null {
  const v = metrics[key];
  if (v == null) return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

/**
 * Record session metrics as a progress snapshot and refresh child skill scores
 * from recent session averages (feeds AI profile + reports).
 */
export async function recordSessionProgress(
  childId: string,
  sessionDate: string,
  structuredMetrics: Record<string, unknown>,
  createdBy: string
): Promise<void> {
  const communication = metricNum(structuredMetrics, 'communication');
  const engagement = metricNum(structuredMetrics, 'engagement');
  const focus = metricNum(structuredMetrics, 'focus');

  if (communication == null && engagement == null && focus == null) return;

  await query(
    `INSERT INTO child_progress_logs
       (child_id, logged_at, communication_score, social_score, behavioral_score, cognitive_score, notes, created_by)
     VALUES ($1, $2::date, $3, $4, $5, $6, $7, $8)`,
    [
      childId,
      sessionDate,
      communication,
      engagement,
      engagement,
      focus,
      'Auto-logged from therapy session',
      createdBy,
    ]
  );

  const avgRows = await query<{
    avg_communication: string | null;
    avg_engagement: string | null;
    avg_focus: string | null;
  }>(
    `SELECT
       AVG((structured_metrics->>'communication')::numeric) AS avg_communication,
       AVG((structured_metrics->>'engagement')::numeric) AS avg_engagement,
       AVG((structured_metrics->>'focus')::numeric) AS avg_focus
     FROM sessions
     WHERE child_id = $1
       AND structured_metrics IS NOT NULL
       AND structured_metrics != '{}'::jsonb`,
    [childId]
  );

  const avg = avgRows[0];
  if (!avg) return;

  const updates: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  const setScore = (col: string, raw: string | null) => {
    if (raw == null) return;
    const n = Math.round(parseFloat(raw));
    if (!Number.isFinite(n)) return;
    updates.push(`${col} = $${i++}`);
    values.push(Math.min(10, Math.max(1, n)));
  };

  setScore('communication_score', avg.avg_communication);
  setScore('social_score', avg.avg_engagement);
  setScore('behavioral_score', avg.avg_engagement);
  setScore('cognitive_score', avg.avg_focus);

  if (updates.length === 0) return;
  values.push(childId);
  await query(`UPDATE children SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${i}`, values);
}
