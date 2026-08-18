import { query, queryOne } from '../../config/database';
import * as childrenService from '../children/children.service';
import { CORE_SESSION_METRICS, metricNum } from '../../shared/sessionMetrics';

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

// ============== THERAPIST PERFORMANCE ANALYTICS ==============

export type DateRangeFilter = { from?: string; to?: string };

const GOAL_UPDATE_LOOKBACK_DAYS_DEFAULT = 30;

/** A session counts as documented if it has real narrative notes, or all 3 core metrics were recorded. */
function isDocumentedSession(notesText: string | null, structuredMetrics: Record<string, unknown>): boolean {
  const notesFilled = Boolean(notesText && notesText.trim());
  const allCoreFilled = CORE_SESSION_METRICS.every((k) => metricNum(structuredMetrics ?? {}, k) != null);
  return notesFilled || allCoreFilled;
}

/** Same "meaningful progress happened" predicate already used for timeline goal-achievement events. */
function isGoalQualifyingSession(structuredMetrics: Record<string, unknown>): boolean {
  const m = structuredMetrics ?? {};
  const progressUpdate = String((m as Record<string, unknown>).progressUpdate ?? '').trim();
  if (progressUpdate) return true;
  const coreScores = CORE_SESSION_METRICS.map((k) => metricNum(m, k));
  const highScores = coreScores.filter((n) => n != null && n >= 8);
  return highScores.length >= 2;
}

type TherapistUserRow = { id: string; full_name: string; title: string | null };

async function listTherapistUsers(therapistId?: string): Promise<TherapistUserRow[]> {
  if (therapistId) {
    const row = await queryOne<TherapistUserRow>(
      `SELECT id, full_name, title FROM users WHERE id = $1 AND role = 'therapist' AND deleted_at IS NULL`,
      [therapistId]
    );
    return row ? [row] : [];
  }
  return query<TherapistUserRow>(
    `SELECT id, full_name, title FROM users WHERE role = 'therapist' AND deleted_at IS NULL ORDER BY full_name`
  );
}

type AppointmentStats = { pending: number; approved: number; completed: number; cancelled: number; total: number };

async function getAppointmentStatsByTherapist(
  filters: DateRangeFilter & { therapistId?: string }
): Promise<Map<string, AppointmentStats>> {
  const params: unknown[] = [];
  const conditions: string[] = [];
  if (filters.from) {
    params.push(filters.from);
    conditions.push(`appointment_date >= $${params.length}`);
  }
  if (filters.to) {
    params.push(filters.to);
    conditions.push(`appointment_date <= $${params.length}`);
  }
  if (filters.therapistId) {
    params.push(filters.therapistId);
    conditions.push(`therapist_id = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = await query<{
    therapist_id: string;
    pending: string;
    approved: string;
    completed: string;
    cancelled: string;
    total: string;
  }>(
    `SELECT therapist_id,
            COUNT(*) FILTER (WHERE status = 'pending')::text AS pending,
            COUNT(*) FILTER (WHERE status = 'approved')::text AS approved,
            COUNT(*) FILTER (WHERE status = 'completed')::text AS completed,
            COUNT(*) FILTER (WHERE status = 'cancelled')::text AS cancelled,
            COUNT(*)::text AS total
     FROM appointments
     ${where}
     GROUP BY therapist_id`,
    params
  );
  const map = new Map<string, AppointmentStats>();
  for (const r of rows) {
    map.set(r.therapist_id, {
      pending: parseInt(r.pending, 10),
      approved: parseInt(r.approved, 10),
      completed: parseInt(r.completed, 10),
      cancelled: parseInt(r.cancelled, 10),
      total: parseInt(r.total, 10),
    });
  }
  return map;
}

type SessionStats = {
  sessionCount: number;
  documentedCount: number;
  avgDurationMinutes: number | null;
  durationSampleSize: number;
};

async function getSessionStatsByTherapist(
  filters: DateRangeFilter & { therapistId?: string }
): Promise<Map<string, SessionStats>> {
  const params: unknown[] = [];
  const conditions: string[] = ['therapist_id IS NOT NULL'];
  if (filters.from) {
    params.push(filters.from);
    conditions.push(`session_date >= $${params.length}`);
  }
  if (filters.to) {
    params.push(filters.to);
    conditions.push(`session_date <= $${params.length}`);
  }
  if (filters.therapistId) {
    params.push(filters.therapistId);
    conditions.push(`therapist_id = $${params.length}`);
  }
  const rows = await query<{
    therapist_id: string;
    duration_minutes: number | null;
    notes_text: string | null;
    structured_metrics: Record<string, unknown>;
  }>(
    `SELECT therapist_id, duration_minutes, notes_text, structured_metrics
     FROM sessions WHERE ${conditions.join(' AND ')}`,
    params
  );
  const map = new Map<string, SessionStats>();
  for (const r of rows) {
    const tid = r.therapist_id;
    const s = map.get(tid) ?? { sessionCount: 0, documentedCount: 0, avgDurationMinutes: null, durationSampleSize: 0 };
    s.sessionCount += 1;
    if (isDocumentedSession(r.notes_text, r.structured_metrics ?? {})) s.documentedCount += 1;
    if (r.duration_minutes != null) {
      const priorTotal = (s.avgDurationMinutes ?? 0) * s.durationSampleSize;
      s.durationSampleSize += 1;
      s.avgDurationMinutes = (priorTotal + r.duration_minutes) / s.durationSampleSize;
    }
    map.set(tid, s);
  }
  return map;
}

/** Children linked to each therapist via either assigned_therapist_id or the child_therapists join table. */
async function getChildrenByTherapist(therapistId?: string): Promise<Map<string, Set<string>>> {
  const params: unknown[] = [];
  let cond = '';
  if (therapistId) {
    params.push(therapistId);
    cond = `WHERE therapist_id = $1`;
  }
  const rows = await query<{ therapist_id: string; child_id: string }>(
    `SELECT therapist_id, child_id FROM (
       SELECT assigned_therapist_id AS therapist_id, id AS child_id
       FROM children WHERE assigned_therapist_id IS NOT NULL AND deleted_at IS NULL
       UNION
       SELECT ct.therapist_id, ct.child_id
       FROM child_therapists ct JOIN children c ON c.id = ct.child_id
       WHERE c.deleted_at IS NULL
     ) u
     ${cond}`,
    params
  );
  const map = new Map<string, Set<string>>();
  for (const r of rows) {
    if (!map.has(r.therapist_id)) map.set(r.therapist_id, new Set());
    map.get(r.therapist_id)!.add(r.child_id);
  }
  return map;
}

type GoalsStats = { totalChildren: number; updatedChildren: number; staleChildIds: string[] };

async function getGoalsUpdatedByTherapist(
  therapistId?: string,
  lookbackDays = GOAL_UPDATE_LOOKBACK_DAYS_DEFAULT
): Promise<Map<string, GoalsStats>> {
  const childrenMap = await getChildrenByTherapist(therapistId);
  const params: unknown[] = [lookbackDays];
  let cond = '';
  if (therapistId) {
    params.push(therapistId);
    cond = `AND therapist_id = $2`;
  }
  const rows = await query<{ therapist_id: string; child_id: string; structured_metrics: Record<string, unknown> }>(
    `SELECT therapist_id, child_id, structured_metrics
     FROM sessions
     WHERE therapist_id IS NOT NULL
       AND session_date >= (CURRENT_DATE - make_interval(days => $1::int))
       ${cond}`,
    params
  );
  const qualifyingByTherapist = new Map<string, Set<string>>();
  for (const r of rows) {
    if (!isGoalQualifyingSession(r.structured_metrics ?? {})) continue;
    if (!qualifyingByTherapist.has(r.therapist_id)) qualifyingByTherapist.set(r.therapist_id, new Set());
    qualifyingByTherapist.get(r.therapist_id)!.add(r.child_id);
  }
  const result = new Map<string, GoalsStats>();
  for (const [tid, childIds] of childrenMap.entries()) {
    const qualifying = qualifyingByTherapist.get(tid) ?? new Set<string>();
    const staleChildIds = [...childIds].filter((id) => !qualifying.has(id));
    result.set(tid, { totalChildren: childIds.size, updatedChildren: qualifying.size, staleChildIds });
  }
  return result;
}

type FeedbackStats = { avgRating: number | null; ratingCount: number };

async function getFeedbackStatsByTherapist(
  filters: DateRangeFilter & { therapistId?: string }
): Promise<Map<string, FeedbackStats>> {
  const params: unknown[] = [];
  const conditions: string[] = ['sc.rating IS NOT NULL', 'sc.deleted_at IS NULL', 's.therapist_id IS NOT NULL'];
  if (filters.from) {
    params.push(filters.from);
    conditions.push(`s.session_date >= $${params.length}`);
  }
  if (filters.to) {
    params.push(filters.to);
    conditions.push(`s.session_date <= $${params.length}`);
  }
  if (filters.therapistId) {
    params.push(filters.therapistId);
    conditions.push(`s.therapist_id = $${params.length}`);
  }
  const rows = await query<{ therapist_id: string; avg_rating: string | null; rating_count: string }>(
    `SELECT s.therapist_id, AVG(sc.rating)::numeric(3,2)::text AS avg_rating, COUNT(sc.rating)::text AS rating_count
     FROM session_comments sc
     JOIN sessions s ON sc.session_id = s.id
     WHERE ${conditions.join(' AND ')}
     GROUP BY s.therapist_id`,
    params
  );
  const map = new Map<string, FeedbackStats>();
  for (const r of rows) {
    map.set(r.therapist_id, {
      avgRating: r.avg_rating != null ? parseFloat(r.avg_rating) : null,
      ratingCount: parseInt(r.rating_count, 10),
    });
  }
  return map;
}

export type TherapistAnalytics = {
  therapistId: string;
  fullName: string;
  title: string | null;
  sessionsTotal: number;
  sessionsPending: number;
  sessionsApproved: number;
  sessionsCompleted: number;
  sessionsCancelled: number;
  utilizationPct: number | null;
  loggedSessionCount: number;
  documentationCompletionPct: number | null;
  avgSessionDurationMinutes: number | null;
  durationSampleSize: number;
  childrenAssigned: number;
  goalsUpdatedPct: number | null;
  parentFeedbackAvg: number | null;
  parentFeedbackCount: number;
};

/** Round to 1 decimal place. */
function pct(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return Math.round((numerator / denominator) * 1000) / 10;
}

export async function getTherapistAnalytics(
  filters: DateRangeFilter & { therapistId?: string; goalsLookbackDays?: number }
): Promise<TherapistAnalytics[]> {
  const therapists = await listTherapistUsers(filters.therapistId);
  if (therapists.length === 0) return [];
  const [apptStats, sessionStats, childrenMap, goalsStats, feedbackStats] = await Promise.all([
    getAppointmentStatsByTherapist(filters),
    getSessionStatsByTherapist(filters),
    getChildrenByTherapist(filters.therapistId),
    getGoalsUpdatedByTherapist(filters.therapistId, filters.goalsLookbackDays),
    getFeedbackStatsByTherapist(filters),
  ]);
  return therapists.map((t) => {
    const appt = apptStats.get(t.id);
    const sess = sessionStats.get(t.id);
    const childIds = childrenMap.get(t.id);
    const goals = goalsStats.get(t.id);
    const feedback = feedbackStats.get(t.id);
    const total = appt?.total ?? 0;
    return {
      therapistId: t.id,
      fullName: t.full_name,
      title: t.title,
      sessionsTotal: total,
      sessionsPending: appt?.pending ?? 0,
      sessionsApproved: appt?.approved ?? 0,
      sessionsCompleted: appt?.completed ?? 0,
      sessionsCancelled: appt?.cancelled ?? 0,
      utilizationPct: pct(appt?.completed ?? 0, total),
      loggedSessionCount: sess?.sessionCount ?? 0,
      documentationCompletionPct: sess ? pct(sess.documentedCount, sess.sessionCount) : null,
      avgSessionDurationMinutes: sess?.avgDurationMinutes != null ? Math.round(sess.avgDurationMinutes) : null,
      durationSampleSize: sess?.durationSampleSize ?? 0,
      childrenAssigned: childIds?.size ?? 0,
      goalsUpdatedPct: goals ? pct(goals.updatedChildren, goals.totalChildren) : null,
      parentFeedbackAvg: feedback?.avgRating ?? null,
      parentFeedbackCount: feedback?.ratingCount ?? 0,
    };
  });
}

export type MissingNotesSession = {
  id: string;
  childId: string;
  childName: string;
  therapistId: string | null;
  therapistName: string | null;
  sessionDate: string;
  durationMinutes: number | null;
};

/** Sessions with no real notes AND not all 3 core metrics recorded — SQL-level predicate so LIMIT bounds the true result set. */
export async function getSessionsMissingNotes(
  filters: DateRangeFilter & { therapistId?: string; limit?: number }
): Promise<MissingNotesSession[]> {
  const params: unknown[] = [];
  const conditions: string[] = [
    `(s.notes_text IS NULL OR trim(s.notes_text) = '')`,
    `NOT (
       (s.structured_metrics->>'engagement') IS NOT NULL AND
       (s.structured_metrics->>'focus') IS NOT NULL AND
       (s.structured_metrics->>'communication') IS NOT NULL
     )`,
  ];
  if (filters.from) {
    params.push(filters.from);
    conditions.push(`s.session_date >= $${params.length}`);
  }
  if (filters.to) {
    params.push(filters.to);
    conditions.push(`s.session_date <= $${params.length}`);
  }
  if (filters.therapistId) {
    params.push(filters.therapistId);
    conditions.push(`s.therapist_id = $${params.length}`);
  }
  const limit = Math.min(filters.limit ?? 50, 200);
  params.push(limit);
  const rows = await query<{
    id: string;
    child_id: string;
    child_name: string;
    therapist_id: string | null;
    therapist_name: string | null;
    session_date: string;
    duration_minutes: number | null;
  }>(
    `SELECT s.id, s.child_id, c.first_name || ' ' || c.last_name AS child_name,
            s.therapist_id, t.full_name AS therapist_name, s.session_date, s.duration_minutes
     FROM sessions s
     JOIN children c ON c.id = s.child_id
     LEFT JOIN users t ON t.id = s.therapist_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY s.session_date DESC
     LIMIT $${params.length}`,
    params
  );
  return rows.map((r) => ({
    id: r.id,
    childId: r.child_id,
    childName: r.child_name,
    therapistId: r.therapist_id,
    therapistName: r.therapist_name,
    sessionDate: r.session_date,
    durationMinutes: r.duration_minutes,
  }));
}

export type StaleGoalChild = {
  childId: string;
  childName: string;
  therapistId: string;
  therapistName: string;
};

/** Children assigned to a therapist with no qualifying "goal progress" session within the lookback window. */
export async function getStaleGoalChildren(filters: {
  therapistId?: string;
  lookbackDays?: number;
}): Promise<StaleGoalChild[]> {
  const [goalsStats, therapists] = await Promise.all([
    getGoalsUpdatedByTherapist(filters.therapistId, filters.lookbackDays),
    listTherapistUsers(filters.therapistId),
  ]);
  const therapistNameById = new Map(therapists.map((t) => [t.id, t.full_name]));
  const staleChildIds = new Set<string>();
  const childToTherapist = new Map<string, string>();
  for (const [tid, stats] of goalsStats.entries()) {
    for (const cid of stats.staleChildIds) {
      staleChildIds.add(cid);
      childToTherapist.set(cid, tid);
    }
  }
  if (staleChildIds.size === 0) return [];
  const rows = await query<{ id: string; first_name: string; last_name: string }>(
    `SELECT id, first_name, last_name FROM children WHERE id = ANY($1::uuid[])`,
    [[...staleChildIds]]
  );
  return rows.map((r) => {
    const tid = childToTherapist.get(r.id) ?? '';
    return {
      childId: r.id,
      childName: `${r.first_name} ${r.last_name}`.trim(),
      therapistId: tid,
      therapistName: therapistNameById.get(tid) ?? '',
    };
  });
}

export type NotAttendedChild = {
  childId: string;
  childName: string;
  lastCompletedAppointmentDate: string | null;
};

/** Active children with no completed appointment within the lookback window (or ever). */
export async function getChildrenNotAttendedRecently(days = 30): Promise<NotAttendedChild[]> {
  const rows = await query<{ id: string; first_name: string; last_name: string; last_completed: string | null }>(
    `SELECT c.id, c.first_name, c.last_name,
            MAX(a.appointment_date) FILTER (WHERE a.status = 'completed') AS last_completed
     FROM children c
     LEFT JOIN appointments a ON a.child_id = c.id
     WHERE c.deleted_at IS NULL AND (c.status IS NULL OR c.status = 'active')
     GROUP BY c.id, c.first_name, c.last_name
     HAVING MAX(a.appointment_date) FILTER (WHERE a.status = 'completed') IS NULL
         OR MAX(a.appointment_date) FILTER (WHERE a.status = 'completed') < (CURRENT_DATE - make_interval(days => $1::int))
     ORDER BY last_completed ASC NULLS FIRST`,
    [days]
  );
  return rows.map((r) => ({
    childId: r.id,
    childName: `${r.first_name} ${r.last_name}`.trim(),
    lastCompletedAppointmentDate: r.last_completed,
  }));
}

export type ClinicSummary = {
  totalSessionsCompleted: number;
  totalCancellations: number;
  totalAppointments: number;
  revenueCents: number;
  currency: string;
  childrenActive: number;
};

/** Admin-only clinic-wide totals (includes revenue) — mirrors billing.service.ts's admin-gated financial data. */
export async function getClinicSummary(filters: DateRangeFilter): Promise<ClinicSummary> {
  const apptParams: unknown[] = [];
  const apptConditions: string[] = [];
  if (filters.from) {
    apptParams.push(filters.from);
    apptConditions.push(`appointment_date >= $${apptParams.length}`);
  }
  if (filters.to) {
    apptParams.push(filters.to);
    apptConditions.push(`appointment_date <= $${apptParams.length}`);
  }
  const apptWhere = apptConditions.length ? `WHERE ${apptConditions.join(' AND ')}` : '';
  const apptRow = await queryOne<{ completed: string; cancelled: string; total: string }>(
    `SELECT COUNT(*) FILTER (WHERE status = 'completed')::text AS completed,
            COUNT(*) FILTER (WHERE status = 'cancelled')::text AS cancelled,
            COUNT(*)::text AS total
     FROM appointments ${apptWhere}`,
    apptParams
  );

  const revParams: unknown[] = [];
  const revConditions: string[] = [`status = 'paid'`];
  if (filters.from) {
    revParams.push(filters.from);
    revConditions.push(`paid_at >= $${revParams.length}::date`);
  }
  if (filters.to) {
    revParams.push(filters.to);
    revConditions.push(`paid_at < ($${revParams.length}::date + INTERVAL '1 day')`);
  }
  const revRow = await queryOne<{ total: string; currency: string | null }>(
    `SELECT COALESCE(SUM(amount_cents), 0)::text AS total, MAX(currency) AS currency
     FROM invoices WHERE ${revConditions.join(' AND ')}`,
    revParams
  );

  const childrenRow = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM children WHERE deleted_at IS NULL AND (status IS NULL OR status = 'active')`
  );

  return {
    totalSessionsCompleted: parseInt(apptRow?.completed ?? '0', 10),
    totalCancellations: parseInt(apptRow?.cancelled ?? '0', 10),
    totalAppointments: parseInt(apptRow?.total ?? '0', 10),
    revenueCents: parseInt(revRow?.total ?? '0', 10),
    currency: revRow?.currency ?? 'AED',
    childrenActive: parseInt(childrenRow?.count ?? '0', 10),
  };
}
