import { api } from './client';

export type ParentNotesConversion = {
  parentSummary: string;
  progressUpdate: string;
  homeRecommendations: string;
};

export async function convertTherapistNotes(input: {
  childId: string;
  notesText: string;
  therapyTitle?: string | null;
  structuredMetrics?: Record<string, unknown>;
}): Promise<ParentNotesConversion> {
  const { data } = await api.post<ParentNotesConversion>('/api/ai/convert-notes', input);
  return data;
}
