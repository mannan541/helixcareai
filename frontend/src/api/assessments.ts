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
  assessmentType: AssessmentTypeId | 'custom';
  customTemplateId?: string | null;
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

export type CustomQuestionType = 'single_choice' | 'multiple_choice' | 'scale' | 'text';

export type CustomQuestion = {
  id: string;
  text: string;
  type: CustomQuestionType;
  options?: string[];
  scaleMax?: number;
};

export type CustomAssessmentTemplate = {
  id: string;
  name: string;
  description: string | null;
  questions: CustomQuestion[];
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
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
  customTemplateId?: string;
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

export async function getAssessment(id: string): Promise<{
  assessment: ChildAssessment;
  template: AssessmentTemplate | null;
  customTemplate: CustomAssessmentTemplate | null;
}> {
  const { data } = await api.get<{
    assessment: ChildAssessment;
    template: AssessmentTemplate | null;
    customTemplate: CustomAssessmentTemplate | null;
  }>(`/api/assessments/${id}`);
  return data;
}

export async function createAssessment(input: {
  childId: string;
  assessmentType: string;
  customTemplateId?: string;
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

// ——— Custom assessment templates ———

export async function listCustomTemplates(activeOnly = true): Promise<CustomAssessmentTemplate[]> {
  const { data } = await api.get<{ templates: CustomAssessmentTemplate[] }>('/api/assessments/custom-templates', {
    params: { activeOnly },
  });
  return data.templates;
}

export async function getCustomTemplate(id: string): Promise<CustomAssessmentTemplate> {
  const { data } = await api.get<{ template: CustomAssessmentTemplate }>(`/api/assessments/custom-templates/${id}`);
  return data.template;
}

export async function createCustomTemplate(input: {
  name: string;
  description?: string;
  questions: CustomQuestion[];
}): Promise<CustomAssessmentTemplate> {
  const { data } = await api.post<{ template: CustomAssessmentTemplate }>('/api/assessments/custom-templates', input);
  return data.template;
}

export async function updateCustomTemplate(
  id: string,
  input: Partial<{ name: string; description: string; questions: CustomQuestion[]; isActive: boolean }>
): Promise<CustomAssessmentTemplate> {
  const { data } = await api.patch<{ template: CustomAssessmentTemplate }>(
    `/api/assessments/custom-templates/${id}`,
    input
  );
  return data.template;
}

export async function deleteCustomTemplate(id: string): Promise<void> {
  await api.delete(`/api/assessments/custom-templates/${id}`);
}
