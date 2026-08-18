import { api } from './client';
import type { SessionMetric } from './types';

export async function childMetrics(childId: string): Promise<SessionMetric[]> {
  const { data } = await api.get(`/api/analytics/child/${childId}`);
  return data.sessions;
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

export type MissingNotesSession = {
  id: string;
  childId: string;
  childName: string;
  therapistId: string | null;
  therapistName: string | null;
  sessionDate: string;
  durationMinutes: number | null;
};

export type StaleGoalChild = {
  childId: string;
  childName: string;
  therapistId: string;
  therapistName: string;
};

export type NotAttendedChild = {
  childId: string;
  childName: string;
  lastCompletedAppointmentDate: string | null;
};

export type ClinicSummary = {
  totalSessionsCompleted: number;
  totalCancellations: number;
  totalAppointments: number;
  revenueCents: number;
  currency: string;
  childrenActive: number;
};

export async function therapistAnalyticsList(params?: { from?: string; to?: string }): Promise<TherapistAnalytics[]> {
  const { data } = await api.get<{ therapists: TherapistAnalytics[] }>('/api/analytics/therapists', { params });
  return data.therapists;
}

export async function therapistAnalyticsOne(
  therapistId: string,
  params?: { from?: string; to?: string }
): Promise<TherapistAnalytics> {
  const { data } = await api.get<{ therapist: TherapistAnalytics }>(`/api/analytics/therapists/${therapistId}`, {
    params,
  });
  return data.therapist;
}

export async function sessionsMissingNotes(params?: {
  from?: string;
  to?: string;
  therapistId?: string;
}): Promise<MissingNotesSession[]> {
  const { data } = await api.get<{ sessions: MissingNotesSession[] }>('/api/analytics/sessions/missing-notes', {
    params,
  });
  return data.sessions;
}

export async function childrenGoalsStale(params?: { therapistId?: string; days?: number }): Promise<StaleGoalChild[]> {
  const { data } = await api.get<{ children: StaleGoalChild[] }>('/api/analytics/children/goals-stale', { params });
  return data.children;
}

export async function childrenNotAttended(params?: { days?: number }): Promise<NotAttendedChild[]> {
  const { data } = await api.get<{ children: NotAttendedChild[] }>('/api/analytics/children/not-attended', { params });
  return data.children;
}

export async function clinicSummary(params?: { from?: string; to?: string }): Promise<ClinicSummary> {
  const { data } = await api.get<{ summary: ClinicSummary }>('/api/analytics/clinic-summary', { params });
  return data.summary;
}
