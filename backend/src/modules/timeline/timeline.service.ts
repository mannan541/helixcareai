import { query } from '../../config/database';
import {
  CORE_SESSION_METRICS,
  extractSessionMetrics,
  metricNum,
} from '../../shared/sessionMetrics';
import * as childrenService from '../children/children.service';

export type TimelineItemType =
  | 'appointment'
  | 'session'
  | 'attendance'
  | 'comment'
  | 'assessment'
  | 'goal_achievement';

export type TimelineItem = {
  id: string;
  type: TimelineItemType;
  occurredAt: string;
  title: string;
  summary: string | null;
  meta: Record<string, unknown>;
  actor: { id: string; fullName: string; role?: string } | null;
};

export type TimelineResult = {
  items: TimelineItem[];
  total: number;
  counts: Record<TimelineItemType, number>;
};

const ALL_TYPES: TimelineItemType[] = [
  'appointment',
  'session',
  'attendance',
  'comment',
  'assessment',
  'goal_achievement',
];

function combineDateTime(date: string, time?: string | null): string {
  const d = date.slice(0, 10);
  if (!time) return `${d}T12:00:00.000Z`;
  const t = time.length <= 5 ? `${time}:00` : time;
  return new Date(`${d}T${t}`).toISOString();
}

function hasParentFriendlyContent(metrics: Record<string, unknown>): boolean {
  return Boolean(
    String(metrics.parentSummary ?? '').trim() ||
      String(metrics.progressUpdate ?? '').trim() ||
      String(metrics.homeRecommendations ?? '').trim()
  );
}

function sessionSummary(
  notesText: string | null,
  metrics: Record<string, unknown>,
  isParent: boolean
): string | null {
  if (isParent && hasParentFriendlyContent(metrics)) {
    const s = String(metrics.parentSummary ?? '').trim();
    if (s) return s;
  }
  const notes = notesText?.trim();
  if (notes) return notes.length > 200 ? notes.slice(0, 197) + '...' : notes;
  const parts: string[] = [];
  if (metrics.therapyTitle) parts.push(String(metrics.therapyTitle));
  for (const k of ['engagement', 'focus', 'communication'] as const) {
    const n = typeof metrics[k] === 'number' ? metrics[k] : parseFloat(String(metrics[k] ?? ''));
    if (Number.isFinite(n)) parts.push(`${k}: ${n}/10`);
  }
  return parts.length ? parts.join(' • ') : null;
}

function appointmentTitle(status: string): string {
  switch (status) {
    case 'pending':
      return 'Appointment requested';
    case 'approved':
      return 'Appointment scheduled';
    case 'completed':
      return 'Appointment completed';
    case 'cancelled':
      return 'Appointment cancelled';
    default:
      return 'Appointment';
  }
}

function isPastAppointment(date: string, endTime: string): boolean {
  const end = new Date(combineDateTime(date, endTime));
  return end.getTime() < Date.now();
}

export async function getChildTimeline(
  childId: string,
  userId: string,
  role: string,
  options: {
    limit?: number;
    offset?: number;
    types?: TimelineItemType[];
    from?: string;
    to?: string;
  } = {}
): Promise<TimelineResult | null> {
  const child = await childrenService.findById(childId);
  if (!child) return null;
  if (!childrenService.canAccessChild(child.user_id, userId, role)) return null;

  const isParent = role === 'parent';
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
  const offset = Math.max(options.offset ?? 0, 0);
  const typeFilter = options.types?.length ? new Set(options.types) : new Set(ALL_TYPES);

  const dateParams: unknown[] = [childId];
  let dateClause = '';
  if (options.from) {
    dateParams.push(options.from);
    dateClause += ` AND appointment_date >= $${dateParams.length}::date`;
  }
  if (options.to) {
    dateParams.push(options.to);
    dateClause += ` AND appointment_date <= $${dateParams.length}::date`;
  }

  const appointmentRows = await query<{
    id: string;
    appointment_date: string;
    start_time: string;
    end_time: string;
    status: string;
    created_at: string;
    therapist_name: string | null;
    session_id: string | null;
  }>(
    `SELECT a.id, a.appointment_date, a.start_time, a.end_time, a.status, a.created_at,
            u.full_name AS therapist_name, s.id AS session_id
     FROM appointments a
     LEFT JOIN users u ON a.therapist_id = u.id
     LEFT JOIN sessions s ON s.appointment_id = a.id
     WHERE a.child_id = $1${dateClause}
     ORDER BY a.appointment_date DESC, a.start_time DESC`,
    dateParams
  );

  const sessionDateParams: unknown[] = [childId];
  let sessionDateClause = '';
  if (options.from) {
    sessionDateParams.push(options.from);
    sessionDateClause += ` AND s.session_date >= $${sessionDateParams.length}::date`;
  }
  if (options.to) {
    sessionDateParams.push(options.to);
    sessionDateClause += ` AND s.session_date <= $${sessionDateParams.length}::date`;
  }

  const sessionRows = await query<{
    id: string;
    session_date: string;
    duration_minutes: number | null;
    notes_text: string | null;
    structured_metrics: Record<string, unknown>;
    created_at: string;
    therapist_name: string | null;
    appointment_id: string | null;
  }>(
    `SELECT s.id, s.session_date, s.duration_minutes, s.notes_text, s.structured_metrics,
            s.created_at, u.full_name AS therapist_name, s.appointment_id
     FROM sessions s
     LEFT JOIN users u ON s.therapist_id = u.id
     WHERE s.child_id = $1${sessionDateClause}
     ORDER BY s.session_date DESC, s.created_at DESC`,
    sessionDateParams
  );

  const commentParams: unknown[] = [childId];
  let commentDateClause = '';
  if (options.from) {
    commentParams.push(options.from);
    commentDateClause += ` AND c.created_at::date >= $${commentParams.length}::date`;
  }
  if (options.to) {
    commentParams.push(options.to);
    commentDateClause += ` AND c.created_at::date <= $${commentParams.length}::date`;
  }

  const commentRows = await query<{
    id: string;
    session_id: string;
    comment: string;
    created_at: string;
    user_id: string;
    user_name: string;
    user_role: string;
    session_date: string;
  }>(
    `SELECT c.id, c.session_id, c.comment, c.created_at, c.user_id,
            u.full_name AS user_name, u.role AS user_role, s.session_date
     FROM session_comments c
     JOIN sessions s ON c.session_id = s.id
     JOIN users u ON c.user_id = u.id
     WHERE s.child_id = $1${commentDateClause}
     ORDER BY c.created_at DESC`,
    commentParams
  );

  const progressParams: unknown[] = [childId];
  let progressDateClause = '';
  if (options.from) {
    progressParams.push(options.from);
    progressDateClause += ` AND logged_at::date >= $${progressParams.length}::date`;
  }
  if (options.to) {
    progressParams.push(options.to);
    progressDateClause += ` AND logged_at::date <= $${progressParams.length}::date`;
  }

  const screeningRows = await query<{
    id: string;
    assessment_type: string;
    assessed_at: string;
    interpretation: string | null;
    respondent: string | null;
    assessor_name: string | null;
  }>(
    `SELECT a.id, a.assessment_type, a.assessed_at, a.interpretation, a.respondent, u.full_name AS assessor_name
     FROM child_assessments a
     LEFT JOIN users u ON a.assessor_id = u.id
     WHERE a.child_id = $1
     ORDER BY a.assessed_at DESC`,
    [childId]
  ).catch(() => [] as Array<{
    id: string;
    assessment_type: string;
    assessed_at: string;
    interpretation: string | null;
    respondent: string | null;
    assessor_name: string | null;
  }>);

  const progressRows = await query<{
    id: string;
    logged_at: string;
    communication_score: number | null;
    social_score: number | null;
    behavioral_score: number | null;
    cognitive_score: number | null;
    notes: string | null;
  }>(
    `SELECT id, logged_at, communication_score, social_score, behavioral_score, cognitive_score, notes
     FROM child_progress_logs
     WHERE child_id = $1${progressDateClause}
     ORDER BY logged_at DESC`,
    progressParams
  );

  const items: TimelineItem[] = [];

  if (typeFilter.has('appointment')) {
    for (const a of appointmentRows) {
      items.push({
        id: `appt-${a.id}`,
        type: 'appointment',
        occurredAt: combineDateTime(a.appointment_date, a.start_time),
        title: appointmentTitle(a.status),
        summary: a.therapist_name
          ? `${a.therapist_name} • ${a.start_time.slice(0, 5)}–${a.end_time.slice(0, 5)}`
          : `${a.start_time.slice(0, 5)}–${a.end_time.slice(0, 5)}`,
        meta: {
          appointmentId: a.id,
          status: a.status,
          sessionId: a.session_id,
          date: a.appointment_date,
          startTime: a.start_time,
          endTime: a.end_time,
        },
        actor: a.therapist_name ? { id: '', fullName: a.therapist_name } : null,
      });
    }
  }

  if (typeFilter.has('attendance')) {
    for (const a of appointmentRows) {
      if (a.status === 'cancelled') continue;
      const past = isPastAppointment(a.appointment_date, a.end_time);
      if (!past) continue;

      if (a.session_id || a.status === 'completed') {
        items.push({
          id: `attend-${a.id}`,
          type: 'attendance',
          occurredAt: combineDateTime(a.appointment_date, a.end_time),
          title: 'Session attended',
          summary: a.therapist_name
            ? `Therapy session logged with ${a.therapist_name}`
            : 'Therapy session logged for this appointment',
          meta: {
            appointmentId: a.id,
            sessionId: a.session_id,
            outcome: 'attended',
            date: a.appointment_date,
          },
          actor: null,
        });
      } else if (a.status === 'approved' || a.status === 'pending') {
        items.push({
          id: `missed-${a.id}`,
          type: 'attendance',
          occurredAt: combineDateTime(a.appointment_date, a.end_time),
          title: 'Missed appointment',
          summary: a.therapist_name
            ? `No session logged for appointment with ${a.therapist_name}`
            : 'No session was logged for this scheduled appointment',
          meta: {
            appointmentId: a.id,
            outcome: 'missed',
            date: a.appointment_date,
          },
          actor: null,
        });
      }
    }
  }

  if (typeFilter.has('session')) {
    for (const s of sessionRows) {
      const m = s.structured_metrics ?? {};
      const therapy = (m.therapyTitle as string) ?? null;
      items.push({
        id: `session-${s.id}`,
        type: 'session',
        occurredAt: combineDateTime(s.session_date),
        title: therapy ? `${therapy} session logged` : 'Therapy session logged',
        summary: sessionSummary(s.notes_text, m, isParent),
        meta: {
          sessionId: s.id,
          appointmentId: s.appointment_id,
          durationMinutes: s.duration_minutes,
          therapyTitle: therapy,
          ...extractSessionMetrics(m),
          parentSummary: isParent || !isParent ? m.parentSummary ?? null : null,
        },
        actor: s.therapist_name ? { id: '', fullName: s.therapist_name } : null,
      });
    }
  }

  if (typeFilter.has('comment')) {
    for (const c of commentRows) {
      const roleLabel = c.user_role === 'parent' ? 'Parent' : c.user_role === 'therapist' ? 'Therapist' : 'Staff';
      items.push({
        id: `comment-${c.id}`,
        type: 'comment',
        occurredAt: new Date(c.created_at).toISOString(),
        title: `${roleLabel} comment`,
        summary: c.comment.length > 200 ? c.comment.slice(0, 197) + '...' : c.comment,
        meta: {
          commentId: c.id,
          sessionId: c.session_id,
          sessionDate: c.session_date,
          fullComment: c.comment,
        },
        actor: { id: c.user_id, fullName: c.user_name, role: c.user_role },
      });
    }
  }

  if (typeFilter.has('assessment')) {
    const screeningNames: Record<string, string> = {
      adhd_rating_scale: 'ADHD Rating Scale',
      vanderbilt: 'Vanderbilt Assessment',
      social_responsiveness_scale: 'Social Responsiveness Scale',
      autism_checklist: 'Autism Checklist',
    };
    for (const s of screeningRows) {
      items.push({
        id: `screening-${s.id}`,
        type: 'assessment',
        occurredAt: combineDateTime(s.assessed_at),
        title: screeningNames[s.assessment_type] ?? 'Screening assessment',
        summary: s.interpretation?.trim() || null,
        meta: { assessmentId: s.id, assessmentType: s.assessment_type, respondent: s.respondent },
        actor: s.assessor_name ? { id: '', fullName: s.assessor_name } : null,
      });
    }
    for (const p of progressRows) {
      const scores: string[] = [];
      if (p.communication_score != null) scores.push(`Communication ${p.communication_score}/10`);
      if (p.social_score != null) scores.push(`Social ${p.social_score}/10`);
      if (p.behavioral_score != null) scores.push(`Behavioral ${p.behavioral_score}/10`);
      if (p.cognitive_score != null) scores.push(`Cognitive ${p.cognitive_score}/10`);
      items.push({
        id: `assessment-${p.id}`,
        type: 'assessment',
        occurredAt: new Date(p.logged_at).toISOString(),
        title: 'Skill assessment recorded',
        summary: p.notes?.trim() || scores.join(' • ') || 'Progress snapshot logged',
        meta: {
          progressLogId: p.id,
          communication: p.communication_score,
          social: p.social_score,
          behavioral: p.behavioral_score,
          cognitive: p.cognitive_score,
        },
        actor: null,
      });
    }
  }

  if (typeFilter.has('goal_achievement')) {
    for (const s of sessionRows) {
      const m = s.structured_metrics ?? {};
      const progressUpdate = String(m.progressUpdate ?? '').trim();
      if (progressUpdate) {
        items.push({
          id: `goal-progress-${s.id}`,
          type: 'goal_achievement',
          occurredAt: combineDateTime(s.session_date),
          title: 'Progress milestone',
          summary: progressUpdate,
          meta: { sessionId: s.id, source: 'progressUpdate' },
          actor: s.therapist_name ? { id: '', fullName: s.therapist_name } : null,
        });
      }

      const coreScores = CORE_SESSION_METRICS.map((k) => metricNum(m, k));
      const highScores = coreScores.filter((n) => n != null && n >= 8);
      if (highScores.length >= 2) {
        const labels: string[] = [];
        const labelNames: Record<string, string> = {
          engagement: 'Engagement',
          focus: 'Focus',
          communication: 'Communication',
        };
        for (const k of CORE_SESSION_METRICS) {
          const n = metricNum(m, k);
          if (n != null && n >= 8) labels.push(`${labelNames[k]} ${n}/10`);
        }
        items.push({
          id: `goal-metrics-${s.id}`,
          type: 'goal_achievement',
          occurredAt: combineDateTime(s.session_date),
          title: 'Strong session performance',
          summary: `High scores recorded: ${labels.join(', ')}`,
          meta: { sessionId: s.id, source: 'metrics', ...extractSessionMetrics(m) },
          actor: s.therapist_name ? { id: '', fullName: s.therapist_name } : null,
        });
      }
    }
  }

  items.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

  const counts = ALL_TYPES.reduce(
    (acc, t) => {
      acc[t] = items.filter((i) => i.type === t).length;
      return acc;
    },
    {} as Record<TimelineItemType, number>
  );

  const total = items.length;
  const page = items.slice(offset, offset + limit);

  return { items: page, total, counts };
}
