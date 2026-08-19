import { query, queryOne } from '../../config/database';
import * as childrenService from '../children/children.service';
import { ASSESSMENT_TEMPLATES, getTemplate, isValidAssessmentType } from './assessmentTemplates';
import { scoreAssessment } from './scoring';
import type { AssessmentTypeId } from './assessmentTemplates';
import * as customTemplatesService from './customTemplates.service';

export type AssessmentRow = {
  id: string;
  child_id: string;
  assessment_type: string;
  custom_template_id: string | null;
  assessed_at: string;
  assessor_id: string | null;
  respondent: string | null;
  responses: Record<string, unknown>;
  scores: Record<string, unknown>;
  interpretation: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type AssessmentWithMeta = AssessmentRow & {
  child_first_name: string;
  child_last_name: string;
  child_code: string | null;
  child_dob: string | null;
  assessor_name: string | null;
  custom_template_name: string | null;
};

export function listTemplates() {
  return ASSESSMENT_TEMPLATES.map((t) => ({
    id: t.id,
    name: t.name,
    shortName: t.shortName,
    description: t.description,
    respondentOptions: t.respondentOptions,
    inputType: t.inputType,
    questionCount: t.questions.length,
    reference: t.reference,
  }));
}

export function getTemplateDetail(typeId: string) {
  const t = getTemplate(typeId);
  if (!t) return null;
  return t;
}

export async function listByChild(
  childId: string,
  userId: string,
  role: string
): Promise<(AssessmentRow & { custom_template_name: string | null })[] | null> {
  const child = await childrenService.findById(childId);
  if (!child) return null;
  if (!childrenService.canAccessChild(child.user_id, userId, role)) return null;

  return query<AssessmentRow & { custom_template_name: string | null }>(
    `SELECT a.*, cat.name AS custom_template_name
     FROM child_assessments a
     LEFT JOIN custom_assessment_templates cat ON cat.id = a.custom_template_id
     WHERE a.child_id = $1 ORDER BY a.assessed_at DESC, a.created_at DESC`,
    [childId]
  );
}

export async function listRecent(
  userId: string,
  role: string,
  filters: { limit?: number; from?: string; to?: string; type?: string; customTemplateId?: string; q?: string } = {}
): Promise<AssessmentWithMeta[]> {
  if (role !== 'admin' && role !== 'therapist') return [];

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (role === 'therapist') {
    params.push(userId);
    conditions.push(`(c.assigned_therapist_id = $${params.length} OR EXISTS (
      SELECT 1 FROM child_therapists ct WHERE ct.child_id = c.id AND ct.therapist_id = $${params.length}
    ))`);
  }
  if (filters.from) {
    params.push(filters.from);
    conditions.push(`a.assessed_at >= $${params.length}`);
  }
  if (filters.to) {
    params.push(filters.to);
    conditions.push(`a.assessed_at <= $${params.length}`);
  }
  if (filters.type) {
    params.push(filters.type);
    conditions.push(`a.assessment_type = $${params.length}`);
  }
  if (filters.customTemplateId) {
    params.push(filters.customTemplateId);
    conditions.push(`a.custom_template_id = $${params.length}`);
  }
  if (filters.q?.trim()) {
    params.push(`%${filters.q.trim()}%`);
    conditions.push(
      `(c.first_name ILIKE $${params.length} OR c.last_name ILIKE $${params.length} OR (c.first_name || ' ' || c.last_name) ILIKE $${params.length})`
    );
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = Math.min(Math.max(filters.limit ?? 20, 1), 200);
  params.push(limit);

  const sql = `
    SELECT a.*, c.first_name AS child_first_name, c.last_name AS child_last_name,
           c.child_code, c.date_of_birth AS child_dob, u.full_name AS assessor_name,
           cat.name AS custom_template_name
    FROM child_assessments a
    JOIN children c ON a.child_id = c.id
    LEFT JOIN users u ON a.assessor_id = u.id
    LEFT JOIN custom_assessment_templates cat ON cat.id = a.custom_template_id
    ${where}
    ORDER BY a.assessed_at DESC, a.created_at DESC LIMIT $${params.length}
  `;

  return query<AssessmentWithMeta>(sql, params);
}

export async function findById(id: string): Promise<AssessmentWithMeta | null> {
  const rows = await query<AssessmentWithMeta>(
    `SELECT a.*, c.first_name AS child_first_name, c.last_name AS child_last_name,
            c.child_code, c.date_of_birth AS child_dob, u.full_name AS assessor_name,
            cat.name AS custom_template_name
     FROM child_assessments a
     JOIN children c ON a.child_id = c.id
     LEFT JOIN users u ON a.assessor_id = u.id
     LEFT JOIN custom_assessment_templates cat ON cat.id = a.custom_template_id
     WHERE a.id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function canAccessAssessment(
  assessment: AssessmentRow,
  userId: string,
  role: string
): Promise<boolean> {
  if (role === 'admin') return true;
  const child = await childrenService.findById(assessment.child_id);
  if (!child) return false;
  return childrenService.canAccessChild(child.user_id, userId, role);
}

export async function create(
  userId: string,
  role: string,
  data: {
    childId: string;
    assessmentType: string;
    customTemplateId?: string;
    assessedAt: string;
    respondent?: string;
    responses: Record<string, unknown>;
    notes?: string;
  }
): Promise<AssessmentRow | null> {
  if (role !== 'admin' && role !== 'therapist') return null;

  let customTemplateId: string | null = null;
  let interpretation: string;
  let scores: Record<string, unknown>;

  if (data.assessmentType === 'custom') {
    if (!data.customTemplateId) return null;
    const template = await customTemplatesService.getCustomTemplate(data.customTemplateId);
    if (!template || !template.is_active) return null;
    customTemplateId = template.id;
    const answered = template.questions.filter((q) => {
      const v = data.responses[q.id];
      return v != null && v !== '' && !(Array.isArray(v) && v.length === 0);
    }).length;
    interpretation = `${answered} of ${template.questions.length} questions answered.`;
    scores = {};
  } else {
    if (!isValidAssessmentType(data.assessmentType)) return null;
    const scored = scoreAssessment(data.assessmentType as AssessmentTypeId, data.responses);
    interpretation = scored.interpretation;
    scores = scored;
  }

  const child = await childrenService.findById(data.childId);
  if (!child) return null;
  if (!childrenService.canAccessChild(child.user_id, userId, role)) return null;

  const rows = await query<AssessmentRow>(
    `INSERT INTO child_assessments
       (child_id, assessment_type, custom_template_id, assessed_at, assessor_id, respondent, responses, scores, interpretation, notes)
     VALUES ($1, $2, $3, $4::date, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      data.childId,
      data.assessmentType,
      customTemplateId,
      data.assessedAt,
      userId,
      data.respondent ?? null,
      JSON.stringify(data.responses),
      JSON.stringify(scores),
      interpretation,
      data.notes ?? null,
    ]
  );
  return rows[0] ?? null;
}

export async function remove(id: string, userId: string, role: string): Promise<boolean> {
  if (role !== 'admin') return false;
  const row = await queryOne<AssessmentRow>('SELECT * FROM child_assessments WHERE id = $1', [id]);
  if (!row) return false;
  const result = await query('DELETE FROM child_assessments WHERE id = $1 RETURNING id', [id]);
  return result.length > 0;
}
