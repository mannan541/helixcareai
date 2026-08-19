import { Request, Response } from 'express';
import * as assessmentsService from './assessments.service';
import { getTemplate as getAssessmentTemplate } from './assessmentTemplates';

function toDto(row: assessmentsService.AssessmentRow | assessmentsService.AssessmentWithMeta) {
  const template = getAssessmentTemplate(row.assessment_type);
  return {
    id: row.id,
    childId: row.child_id,
    assessmentType: row.assessment_type,
    assessmentName: template?.name ?? row.assessment_type,
    assessedAt: row.assessed_at,
    assessorId: row.assessor_id,
    respondent: row.respondent,
    responses: row.responses,
    scores: row.scores,
    interpretation: row.interpretation,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    childFirstName: 'child_first_name' in row ? row.child_first_name : undefined,
    childLastName: 'child_last_name' in row ? row.child_last_name : undefined,
    childCode: 'child_code' in row ? row.child_code : undefined,
    childDob: 'child_dob' in row ? row.child_dob : undefined,
    assessorName: 'assessor_name' in row ? row.assessor_name : undefined,
  };
}

export async function listTemplates(_req: Request, res: Response): Promise<void> {
  res.json({ templates: assessmentsService.listTemplates() });
}

export async function getTemplateByType(req: Request, res: Response): Promise<void> {
  const template = assessmentsService.getTemplateDetail(req.params.typeId);
  if (!template) {
    res.status(404).json({ error: 'Assessment template not found' });
    return;
  }
  res.json({ template });
}

export async function listRecent(req: Request, res: Response): Promise<void> {
  const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 200);
  const rows = await assessmentsService.listRecent(req.user!.userId, req.user!.role, {
    limit,
    from: req.query.from as string | undefined,
    to: req.query.to as string | undefined,
    type: req.query.type as string | undefined,
    q: req.query.q as string | undefined,
  });
  res.json({ assessments: rows.map(toDto) });
}

export async function listByChild(req: Request, res: Response): Promise<void> {
  const rows = await assessmentsService.listByChild(req.params.childId, req.user!.userId, req.user!.role);
  if (rows === null) {
    res.status(404).json({ error: 'Child not found or access denied' });
    return;
  }
  res.json({ assessments: rows.map(toDto) });
}

export async function getOne(req: Request, res: Response): Promise<void> {
  const row = await assessmentsService.findById(req.params.id);
  if (!row) {
    res.status(404).json({ error: 'Assessment not found' });
    return;
  }
  const allowed = await assessmentsService.canAccessAssessment(row, req.user!.userId, req.user!.role);
  if (!allowed) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }
  const template = getAssessmentTemplate(row.assessment_type);
  res.json({ assessment: toDto(row), template: template ?? null });
}

export async function create(req: Request, res: Response): Promise<void> {
  const { childId, assessmentType, assessedAt, respondent, responses, notes } = req.body;
  const row = await assessmentsService.create(req.user!.userId, req.user!.role, {
    childId,
    assessmentType,
    assessedAt,
    respondent,
    responses,
    notes,
  });
  if (!row) {
    res.status(400).json({ error: 'Unable to save assessment. Check child access and assessment type.' });
    return;
  }
  const withMeta = await assessmentsService.findById(row.id);
  res.status(201).json({ assessment: withMeta ? toDto(withMeta) : toDto(row) });
}

export async function remove(req: Request, res: Response): Promise<void> {
  const ok = await assessmentsService.remove(req.params.id, req.user!.userId, req.user!.role);
  if (!ok) {
    res.status(404).json({ error: 'Assessment not found or cannot delete' });
    return;
  }
  res.json({ ok: true });
}
