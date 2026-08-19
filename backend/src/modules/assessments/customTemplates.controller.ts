import { Request, Response } from 'express';
import * as customTemplatesService from './customTemplates.service';

function toDto(t: customTemplatesService.CustomAssessmentTemplateRow) {
  return {
    id: t.id,
    name: t.name,
    description: t.description,
    questions: t.questions,
    isActive: t.is_active,
    createdBy: t.created_by,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  };
}

export async function list(req: Request, res: Response): Promise<void> {
  const activeOnly = req.user!.role !== 'admin' || req.query.activeOnly !== 'false';
  const rows = await customTemplatesService.listCustomTemplates(activeOnly);
  res.json({ templates: rows.map(toDto) });
}

export async function getOne(req: Request, res: Response): Promise<void> {
  const row = await customTemplatesService.getCustomTemplate(req.params.id);
  if (!row) {
    res.status(404).json({ error: 'Custom assessment not found' });
    return;
  }
  res.json({ template: toDto(row) });
}

export async function create(req: Request, res: Response): Promise<void> {
  const { name, description, questions } = req.body as { name?: string; description?: string; questions?: unknown };
  if (!name?.trim()) {
    res.status(400).json({ error: 'Title is required' });
    return;
  }
  const validated = customTemplatesService.validateQuestions(questions);
  if (!validated.ok) {
    res.status(400).json({ error: validated.error });
    return;
  }
  const row = await customTemplatesService.createCustomTemplate(req.user!.userId, {
    name,
    description,
    questions: validated.questions,
  });
  res.status(201).json({ template: toDto(row) });
}

export async function update(req: Request, res: Response): Promise<void> {
  const { name, description, questions, isActive } = req.body as {
    name?: string;
    description?: string;
    questions?: unknown;
    isActive?: boolean;
  };
  let validatedQuestions: customTemplatesService.CustomQuestion[] | undefined;
  if (questions !== undefined) {
    const validated = customTemplatesService.validateQuestions(questions);
    if (!validated.ok) {
      res.status(400).json({ error: validated.error });
      return;
    }
    validatedQuestions = validated.questions;
  }
  const row = await customTemplatesService.updateCustomTemplate(req.params.id, {
    name,
    description,
    questions: validatedQuestions,
    isActive,
  });
  if (!row) {
    res.status(404).json({ error: 'Custom assessment not found' });
    return;
  }
  res.json({ template: toDto(row) });
}

export async function remove(req: Request, res: Response): Promise<void> {
  const result = await customTemplatesService.deleteCustomTemplate(req.params.id);
  if (result.inUse) {
    res.status(409).json({
      error: 'This custom assessment has already been used for a saved assessment and cannot be deleted. Deactivate it instead.',
    });
    return;
  }
  if (!result.ok) {
    res.status(404).json({ error: 'Custom assessment not found' });
    return;
  }
  res.status(204).send();
}
