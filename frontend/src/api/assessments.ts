import { api } from './client';

export type AssessmentTypeId =
  | 'adhd_rating_scale'
  | 'vanderbilt'
  | 'social_responsiveness_scale'
  | 'autism_checklist';

export type AssessmentTemplateSummary = {
  id: AssessmentTypeId;
  name: string;
  shortName: string;
  description: string;
  respondentOptions: string[];
  inputType: string;
  questionCount: number;
  reference: string;
};

export type AssessmentQuestion = {
  id: string;
  text: string;
  subscale?: string;
};

export type AssessmentTemplate = AssessmentTemplateSummary & {
  questions: AssessmentQuestion[];
};

export type ChildAssessment = {
  id: string;
  childId: string;
  assessmentType: AssessmentTypeId;
  assessmentName: string;
  assessedAt: string;
  assessorId?: string;
  respondent?: string | null;
  responses: Record<string, unknown>;
  scores: Record<string, unknown>;
  interpretation?: string | null;
  notes?: string | null;
  createdAt: string;
  childFirstName?: string;
  childLastName?: string;
  childCode?: string | null;
  childDob?: string | null;
  assessorName?: string | null;
};

export async function listAssessmentTemplates(): Promise<AssessmentTemplateSummary[]> {
  const { data } = await api.get<{ templates: AssessmentTemplateSummary[] }>('/api/assessments/templates');
  return data.templates;
}

export async function getAssessmentTemplate(typeId: string): Promise<AssessmentTemplate> {
  const { data } = await api.get<{ template: AssessmentTemplate }>(`/api/assessments/templates/${typeId}`);
  return data.template;
}

export async function listRecentAssessments(params?: {
  limit?: number;
  from?: string;
  to?: string;
  type?: string;
  q?: string;
}): Promise<ChildAssessment[]> {
  const { data } = await api.get<{ assessments: ChildAssessment[] }>('/api/assessments/recent', {
    params: { limit: params?.limit ?? 50, ...params },
  });
  return data.assessments;
}

export async function listChildAssessments(childId: string): Promise<ChildAssessment[]> {
  const { data } = await api.get<{ assessments: ChildAssessment[] }>(`/api/assessments/child/${childId}`);
  return data.assessments;
}

export async function getAssessment(id: string): Promise<{ assessment: ChildAssessment; template: AssessmentTemplate | null }> {
  const { data } = await api.get<{ assessment: ChildAssessment; template: AssessmentTemplate | null }>(
    `/api/assessments/${id}`
  );
  return data;
}

export async function createAssessment(input: {
  childId: string;
  assessmentType: string;
  assessedAt: string;
  respondent?: string;
  responses: Record<string, unknown>;
  notes?: string;
}): Promise<ChildAssessment> {
  const { data } = await api.post<{ assessment: ChildAssessment }>('/api/assessments', input);
  return data.assessment;
}

export async function deleteAssessment(id: string): Promise<void> {
  await api.delete(`/api/assessments/${id}`);
}
