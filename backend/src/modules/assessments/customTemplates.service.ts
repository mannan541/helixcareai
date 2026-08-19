import { query, queryOne } from '../../config/database';

export type CustomQuestionType = 'single_choice' | 'multiple_choice' | 'scale' | 'text';

export type CustomQuestion = {
  id: string;
  text: string;
  type: CustomQuestionType;
  options?: string[];
  scaleMax?: number;
};

export type CustomAssessmentTemplateRow = {
  id: string;
  name: string;
  description: string | null;
  questions: CustomQuestion[];
  created_by: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

/** Postgres foreign_key_violation error code — used to guard deletes of templates already in use. */
function isForeignKeyViolation(err: unknown): boolean {
  return (err as { code?: string })?.code === '23503';
}

function isValidQuestionType(t: unknown): t is CustomQuestionType {
  return t === 'single_choice' || t === 'multiple_choice' || t === 'scale' || t === 'text';
}

/** Basic structural validation — not exhaustive, just enough to prevent malformed data from being stored. */
export function validateQuestions(questions: unknown): { ok: true; questions: CustomQuestion[] } | { ok: false; error: string } {
  if (!Array.isArray(questions) || questions.length === 0) {
    return { ok: false, error: 'At least one question is required.' };
  }
  const cleaned: CustomQuestion[] = [];
  for (const [i, raw] of questions.entries()) {
    const q = raw as Record<string, unknown>;
    const text = typeof q.text === 'string' ? q.text.trim() : '';
    if (!text) return { ok: false, error: `Question ${i + 1} is missing text.` };
    if (!isValidQuestionType(q.type)) return { ok: false, error: `Question ${i + 1} has an invalid type.` };
    const id = typeof q.id === 'string' && q.id.trim() ? q.id.trim() : `q${i + 1}`;
    const entry: CustomQuestion = { id, text, type: q.type };
    if (q.type === 'single_choice' || q.type === 'multiple_choice') {
      const options = Array.isArray(q.options)
        ? q.options.map((o) => String(o).trim()).filter(Boolean)
        : [];
      if (options.length < 2) {
        return { ok: false, error: `Question ${i + 1} (${text}) needs at least 2 options.` };
      }
      entry.options = options;
    }
    if (q.type === 'scale') {
      const max = Number(q.scaleMax);
      entry.scaleMax = Number.isFinite(max) && max >= 2 && max <= 10 ? Math.round(max) : 5;
    }
    cleaned.push(entry);
  }
  return { ok: true, questions: cleaned };
}

export async function listCustomTemplates(activeOnly = true): Promise<CustomAssessmentTemplateRow[]> {
  const sql = activeOnly
    ? 'SELECT * FROM custom_assessment_templates WHERE is_active = true ORDER BY name'
    : 'SELECT * FROM custom_assessment_templates ORDER BY is_active DESC, name';
  return query<CustomAssessmentTemplateRow>(sql);
}

export async function getCustomTemplate(id: string): Promise<CustomAssessmentTemplateRow | null> {
  return queryOne<CustomAssessmentTemplateRow>('SELECT * FROM custom_assessment_templates WHERE id = $1', [id]);
}

export async function createCustomTemplate(
  userId: string,
  data: { name: string; description?: string; questions: CustomQuestion[] }
): Promise<CustomAssessmentTemplateRow> {
  const rows = await query<CustomAssessmentTemplateRow>(
    `INSERT INTO custom_assessment_templates (name, description, questions, created_by)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [data.name.trim(), data.description?.trim() ?? null, JSON.stringify(data.questions), userId]
  );
  return rows[0];
}

export async function updateCustomTemplate(
  id: string,
  data: Partial<{ name: string; description: string; questions: CustomQuestion[]; isActive: boolean }>
): Promise<CustomAssessmentTemplateRow | null> {
  const rows = await query<CustomAssessmentTemplateRow>(
    `UPDATE custom_assessment_templates SET
       name = COALESCE($2, name),
       description = COALESCE($3, description),
       questions = COALESCE($4, questions),
       is_active = COALESCE($5, is_active),
       updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, data.name?.trim(), data.description?.trim(), data.questions ? JSON.stringify(data.questions) : undefined, data.isActive]
  );
  return rows[0] ?? null;
}

/** Delete a template. Fails if it's already used for a saved assessment (FK RESTRICT) — deactivate instead in that case. */
export async function deleteCustomTemplate(id: string): Promise<{ ok: boolean; inUse?: boolean }> {
  try {
    const result = await query('DELETE FROM custom_assessment_templates WHERE id = $1 RETURNING id', [id]);
    return { ok: result.length > 0 };
  } catch (err) {
    if (isForeignKeyViolation(err)) return { ok: false, inUse: true };
    throw err;
  }
}
