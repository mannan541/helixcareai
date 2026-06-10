import { api } from './client';
import type { Session, SessionComment } from './types';

export async function listSessionsByChild(
  childId: string,
  params?: { limit?: number; offset?: number }
): Promise<{ sessions: Session[]; total: number }> {
  const { data } = await api.get(`/api/sessions/child/${childId}`, {
    params: { limit: 100, ...params },
  });
  return data;
}

export async function getSession(id: string): Promise<Session> {
  const { data } = await api.get(`/api/sessions/${id}`);
  return data.session;
}

export type SessionInput = {
  childId: string;
  sessionDate: string;
  therapistId?: string | null;
  durationMinutes?: number;
  notesText?: string;
  structuredMetrics?: Record<string, unknown>;
  appointmentId?: string | null;
};

export async function createSession(input: SessionInput): Promise<Session> {
  const { data } = await api.post('/api/sessions', input);
  return data.session;
}

export async function updateSession(
  id: string,
  input: Partial<Omit<SessionInput, 'childId' | 'appointmentId'>>
): Promise<Session> {
  const { data } = await api.patch(`/api/sessions/${id}`, input);
  return data.session;
}

export async function deleteSession(id: string): Promise<void> {
  await api.delete(`/api/sessions/${id}`);
}

export async function listComments(sessionId: string): Promise<SessionComment[]> {
  const { data } = await api.get(`/api/sessions/${sessionId}/comments`);
  return data.comments;
}

export async function addComment(sessionId: string, comment: string): Promise<SessionComment> {
  const { data } = await api.post(`/api/sessions/${sessionId}/comments`, { comment });
  return data.comment;
}

export async function updateComment(
  sessionId: string,
  commentId: string,
  comment: string
): Promise<SessionComment> {
  const { data } = await api.patch(`/api/sessions/${sessionId}/comments/${commentId}`, { comment });
  return data.comment;
}

export async function deleteComment(sessionId: string, commentId: string): Promise<void> {
  await api.delete(`/api/sessions/${sessionId}/comments/${commentId}`);
}
