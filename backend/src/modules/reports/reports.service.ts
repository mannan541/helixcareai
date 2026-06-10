import { query } from '../../config/database';
import * as childrenService from '../children/children.service';

export type ChildReport = {
  child: {
    id: string;
    fullName: string;
    childCode: string | null;
    diagnosis: string | null;
    therapyStatus: string | null;
    scores: {
      communication: number | null;
      social: number | null;
      behavioral: number | null;
      cognitive: number | null;
      motor: number | null;
    };
  };
  period: { from: string; to: string };
  attendance: {
    scheduled: number;
    completed: number;
    cancelled: number;
    missed: number;
    attendanceRate: number | null;
  };
  performance: {
    totalSessions: number;
    totalMinutes: number;
    avgEngagement: number | null;
    avgFocus: number | null;
    avgCommunication: number | null;
    trend: {
      engagementChange: number | null;
      focusChange: number | null;
      communicationChange: number | null;
    };
  };
  progress: {
    snapshots: Array<{
      loggedAt: string;
      communication: number | null;
      social: number | null;
      behavioral: number | null;
      cognitive: number | null;
    }>;
  };
  sessions: Array<{
    id: string;
    date: string;
    durationMinutes: number | null;
    therapyTitle: string | null;
    engagement: number | null;
    focus: number | null;
    communication: number | null;
    notesPreview: string | null;
  }>;
  appointments: Array<{
    date: string;
    startTime: string;
    endTime: string;
    status: string;
    therapistName: string | null;
    hasSession: boolean;
  }>;
};

function metricNum(metrics: Record<string, unknown>, key: string): number | null {
  const v = metrics[key];
  if (v == null) return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

function halfTrend(values: number[]): number | null {
  if (values.length < 2) return null;
  const mid = Math.floor(values.length / 2);
  const first = avg(values.slice(0, mid));
  const second = avg(values.slice(mid));
  if (first == null || second == null) return null;
  return Math.round((second - first) * 10) / 10;
}

export async function generateChildReport(
  childId: string,
  fromDate: string,
  toDate: string,
  userId: string,
  role: string
): Promise<ChildReport | null> {
  const child = await childrenService.findById(childId);
  if (!child) return null;
  if (!childrenService.canAccessChild(child.user_id, userId, role)) return null;

  const sessionRows = await query<{
    id: string;
    session_date: string;
    duration_minutes: number | null;
    notes_text: string | null;
    structured_metrics: Record<string, unknown>;
  }>(
    `SELECT id, session_date, duration_minutes, notes_text, structured_metrics
     FROM sessions
     WHERE child_id = $1 AND session_date >= $2::date AND session_date <= $3::date
     ORDER BY session_date ASC`,
    [childId, fromDate, toDate]
  );

  const appointmentRows = await query<{
    appointment_date: string;
    start_time: string;
    end_time: string;
    status: string;
    therapist_name: string | null;
    session_id: string | null;
  }>(
    `SELECT a.appointment_date, a.start_time, a.end_time, a.status,
            u.full_name AS therapist_name, s.id AS session_id
     FROM appointments a
     LEFT JOIN users u ON a.therapist_id = u.id
     LEFT JOIN sessions s ON s.appointment_id = a.id
     WHERE a.child_id = $1
       AND a.appointment_date >= $2::date
       AND a.appointment_date <= $3::date
     ORDER BY a.appointment_date ASC, a.start_time ASC`,
    [childId, fromDate, toDate]
  );

  const progressRows = await query<{
    logged_at: string;
    communication_score: number | null;
    social_score: number | null;
    behavioral_score: number | null;
    cognitive_score: number | null;
  }>(
    `SELECT logged_at, communication_score, social_score, behavioral_score, cognitive_score
     FROM child_progress_logs
     WHERE child_id = $1
       AND logged_at::date >= $2::date
       AND logged_at::date <= $3::date
     ORDER BY logged_at ASC`,
    [childId, fromDate, toDate]
  );

  const engagements: number[] = [];
  const focuses: number[] = [];
  const communications: number[] = [];

  const sessions = sessionRows.map((s) => {
    const m = s.structured_metrics ?? {};
    const engagement = metricNum(m, 'engagement');
    const focus = metricNum(m, 'focus');
    const communication = metricNum(m, 'communication');
    if (engagement != null) engagements.push(engagement);
    if (focus != null) focuses.push(focus);
    if (communication != null) communications.push(communication);
    const notes = s.notes_text?.trim();
    return {
      id: s.id,
      date: s.session_date,
      durationMinutes: s.duration_minutes,
      therapyTitle: (m.therapyTitle as string) ?? null,
      engagement,
      focus,
      communication,
      notesPreview: notes ? (notes.length > 120 ? notes.slice(0, 117) + '...' : notes) : null,
    };
  });

  const scheduled = appointmentRows.filter((a) => a.status !== 'cancelled').length;
  const completed = appointmentRows.filter((a) => a.status === 'completed' || a.session_id != null).length;
  const cancelled = appointmentRows.filter((a) => a.status === 'cancelled').length;
  const missed = Math.max(0, scheduled - completed);

  const fullName = [child.first_name, child.last_name].filter(Boolean).join(' ');

  return {
    child: {
      id: child.id,
      fullName,
      childCode: child.child_code ?? null,
      diagnosis: child.diagnosis ?? null,
      therapyStatus: child.therapy_status ?? null,
      scores: {
        communication: child.communication_score ?? null,
        social: child.social_score ?? null,
        behavioral: child.behavioral_score ?? null,
        cognitive: child.cognitive_score ?? null,
        motor: child.motor_skill_score ?? null,
      },
    },
    period: { from: fromDate, to: toDate },
    attendance: {
      scheduled,
      completed,
      cancelled,
      missed,
      attendanceRate: scheduled > 0 ? Math.round((completed / scheduled) * 1000) / 10 : null,
    },
    performance: {
      totalSessions: sessions.length,
      totalMinutes: sessions.reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0),
      avgEngagement: avg(engagements),
      avgFocus: avg(focuses),
      avgCommunication: avg(communications),
      trend: {
        engagementChange: halfTrend(engagements),
        focusChange: halfTrend(focuses),
        communicationChange: halfTrend(communications),
      },
    },
    progress: {
      snapshots: progressRows.map((p) => ({
        loggedAt: p.logged_at,
        communication: p.communication_score,
        social: p.social_score,
        behavioral: p.behavioral_score,
        cognitive: p.cognitive_score,
      })),
    },
    sessions,
    appointments: appointmentRows.map((a) => ({
      date: a.appointment_date,
      startTime: a.start_time,
      endTime: a.end_time,
      status: a.status,
      therapistName: a.therapist_name,
      hasSession: a.session_id != null,
    })),
  };
}

export function reportToCsv(report: ChildReport): string {
  const lines: string[] = [];
  const esc = (v: string | number | null | undefined) => {
    const s = v == null ? '' : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };

  lines.push('HelixCareAI Child Report');
  lines.push(`Child,${esc(report.child.fullName)}`);
  lines.push(`Child Code,${esc(report.child.childCode)}`);
  lines.push(`Period,${esc(report.period.from)} to ${esc(report.period.to)}`);
  lines.push(`Diagnosis,${esc(report.child.diagnosis)}`);
  lines.push('');

  lines.push('ATTENDANCE');
  lines.push(`Scheduled,${report.attendance.scheduled}`);
  lines.push(`Completed,${report.attendance.completed}`);
  lines.push(`Cancelled,${report.attendance.cancelled}`);
  lines.push(`Missed,${report.attendance.missed}`);
  lines.push(`Attendance Rate %,${report.attendance.attendanceRate ?? ''}`);
  lines.push('');

  lines.push('PERFORMANCE SUMMARY');
  lines.push(`Total Sessions,${report.performance.totalSessions}`);
  lines.push(`Total Minutes,${report.performance.totalMinutes}`);
  lines.push(`Avg Engagement,${report.performance.avgEngagement ?? ''}`);
  lines.push(`Avg Focus,${report.performance.avgFocus ?? ''}`);
  lines.push(`Avg Communication,${report.performance.avgCommunication ?? ''}`);
  lines.push(`Engagement Trend (2nd half - 1st),${report.performance.trend.engagementChange ?? ''}`);
  lines.push(`Focus Trend,${report.performance.trend.focusChange ?? ''}`);
  lines.push(`Communication Trend,${report.performance.trend.communicationChange ?? ''}`);
  lines.push('');

  lines.push('CURRENT SKILL SCORES');
  lines.push(`Communication,${report.child.scores.communication ?? ''}`);
  lines.push(`Social,${report.child.scores.social ?? ''}`);
  lines.push(`Behavioral,${report.child.scores.behavioral ?? ''}`);
  lines.push(`Cognitive,${report.child.scores.cognitive ?? ''}`);
  lines.push(`Motor,${report.child.scores.motor ?? ''}`);
  lines.push('');

  lines.push('SESSIONS');
  lines.push('Date,Therapy,Duration (min),Engagement,Focus,Communication,Notes');
  for (const s of report.sessions) {
    lines.push(
      [s.date, s.therapyTitle, s.durationMinutes, s.engagement, s.focus, s.communication, s.notesPreview]
        .map(esc)
        .join(',')
    );
  }
  lines.push('');

  lines.push('APPOINTMENTS');
  lines.push('Date,Start,End,Status,Therapist,Session Logged');
  for (const a of report.appointments) {
    lines.push(
      [a.date, a.startTime, a.endTime, a.status, a.therapistName, a.hasSession ? 'Yes' : 'No']
        .map(esc)
        .join(',')
    );
  }

  return lines.join('\n');
}
