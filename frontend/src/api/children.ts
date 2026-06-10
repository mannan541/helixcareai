import { api } from './client';
import type { Child } from './types';

export async function listChildren(params?: {
  q?: string;
  limit?: number;
  offset?: number;
}): Promise<{ children: Child[]; total: number }> {
  const { data } = await api.get('/api/children', { params: { limit: 100, ...params } });
  return data;
}

export async function getChild(id: string): Promise<Child> {
  const { data } = await api.get(`/api/children/${id}`);
  return data.child;
}

export type ChildInput = Partial<{
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  notes: string;
  diagnosis: string;
  referredBy: string;
  childCode: string;
  gender: string;
  diagnosisType: string;
  autismLevel: string;
  diagnosisDate: string;
  primaryLanguage: string;
  communicationType: string;
  behavioralNotes: string;
  medicalConditions: string;
  medications: string;
  allergies: string;
  therapyStartDate: string;
  therapyStatus: string;
  assignedTherapistId: string;
  assignedTherapistIds: string[];
  sessionsPerWeek: number;
  communicationScore: number;
  socialScore: number;
  behavioralScore: number;
  cognitiveScore: number;
  motorSkillScore: number;
  status: string;
}>;

export async function createChild(input: ChildInput): Promise<Child> {
  const { data } = await api.post('/api/children', input);
  return data.child;
}

export async function updateChild(id: string, input: ChildInput): Promise<Child> {
  const { data } = await api.patch(`/api/children/${id}`, input);
  return data.child;
}

export async function deleteChild(id: string): Promise<void> {
  await api.delete(`/api/children/${id}`);
}
