import { query, queryOne } from '../../config/database';
import * as childrenService from '../children/children.service';
import { ASSESSMENT_TEMPLATES, getTemplate, isValidAssessmentType } from './assessmentTemplates';
import { scoreAssessment } from './scoring';
import type { AssessmentTypeId } from './assessmentTemplates';

export type AssessmentRow = {
  id: string;
  child_id: string;
  assessment_type: string;
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
): Promise<AssessmentRow[] | null> {
  const child = await childrenService.findById(childId);
  if (!child) return null;
  if (!childrenService.canAccessChild(child.user_id, userId, role)) return null;

  return query<AssessmentRow>(
    `SELECT * FROM child_assessments WHERE child_id = $1 ORDER BY assessed_at DESC, created_at DESC`,
    [childId]
  );
}

export async function listRecent(
  userId: string,
  role: string,
  limit = 20
): Promise<AssessmentWithMeta[]> {
  if (role !== 'admin' && role !== 'therapist') return [];

  let sql = `
    SELECT a.*, c.first_name AS child_first_name, c.last_name AS child_last_name,
           c.child_code, c.date_of_birth AS child_dob, u.full_name AS assessor_name
    FROM child_assessments a
    JOIN children c ON a.child_id = c.id
    LEFT JOIN users u ON a.assessor_id = u.id
  `;
  const params: unknown[] = [];

  if (role === 'therapist') {
    params.push(userId);
    sql += ` WHERE c.assigned_therapist_id = $${params.length} OR EXISTS (
      SELECT 1 FROM child_therapists ct WHERE ct.child_id = c.id AND ct.therapist_id = $${params.length}
    )`;
  }

  params.push(limit);
  sql += ` ORDER BY a.assessed_at DESC, a.created_at DESC LIMIT $${params.length}`;

  return query<AssessmentWithMeta>(sql, params);
}

export async function findById(id: string): Promise<AssessmentWithMeta | null> {
  const rows = await query<AssessmentWithMeta>(
    `SELECT a.*, c.first_name AS child_first_name, c.last_name AS child_last_name,
            c.child_code, c.date_of_birth AS child_dob, u.full_name AS assessor_name
     FROM child_assessments a
     JOIN children c ON a.child_id = c.id
     LEFT JOIN users u ON a.assessor_id = u.id
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
    assessedAt: string;
    respondent?: string;
    responses: Record<string, unknown>;
    notes?: string;
  }
): Promise<AssessmentRow | null> {
  if (role !== 'admin' && role !== 'therapist') return null;
  if (!isValidAssessmentType(data.assessmentType)) return null;

  const child = await childrenService.findById(data.childId);
  if (!child) return null;
  if (!childrenService.canAccessChild(child.user_id, userId, role)) return null;

  const scored = scoreAssessment(data.assessmentType as AssessmentTypeId, data.responses);

  const rows = await query<AssessmentRow>(
    `INSERT INTO child_assessments
       (child_id, assessment_type, assessed_at, assessor_id, respondent, responses, scores, interpretation, notes)
     VALUES ($1, $2, $3::date, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      data.childId,
      data.assessmentType,
      data.assessedAt,
      userId,
      data.respondent ?? null,
      JSON.stringify(data.responses),
      JSON.stringify(scored),
      scored.interpretation,
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
