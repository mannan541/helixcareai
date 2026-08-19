import { Request, Response } from 'express';
import { uploadResourceFile } from '../../lib/fileStorage';
import * as resourcesService from './resources.service';

function toResourceDto(
  r: resourcesService.TherapyResourceRow | resourcesService.ResourceWithCreator,
  opts?: { includeFile?: boolean }
) {
  const includeFile = opts?.includeFile !== false;
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    category: r.category,
    fileUrl: includeFile ? r.file_url : null,
    fileName: r.file_name,
    mimeType: r.mime_type,
    content: r.content,
    hasFile: Boolean(r.file_url),
    tags: r.tags ?? [],
    createdBy: r.created_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    creatorName: 'creator_name' in r ? r.creator_name : undefined,
  };
}

export async function list(req: Request, res: Response): Promise<void> {
  const category = req.query.category as string | undefined;
  const q = req.query.q as string | undefined;
  const limit = parseInt(req.query.limit as string, 10);
  const offset = parseInt(req.query.offset as string, 10);
  const { rows, total } = await resourcesService.listResources({
    category,
    q,
    limit: Number.isFinite(limit) ? limit : undefined,
    offset: Number.isFinite(offset) ? offset : undefined,
  });
  res.json({
    resources: rows.map((r) => toResourceDto(r, { includeFile: false })),
    total,
    limit: limit || 50,
    offset: offset || 0,
  });
}

export async function getOne(req: Request, res: Response): Promise<void> {
  const row = await resourcesService.findById(req.params.id);
  if (!row) {
    res.status(404).json({ error: 'Resource not found' });
    return;
  }
  const assignments = await resourcesService.listAssignmentsForResource(row.id);
  res.json({
    resource: toResourceDto(row),
    assignments: assignments.map((a) => ({
      id: a.id,
      childId: a.child_id,
      childName: `${a.child_first_name} ${a.child_last_name}`.trim(),
      assignedAt: a.assigned_at,
      notes: a.notes,
    })),
  });
}

export async function createWithFile(req: Request, res: Response): Promise<void> {
  const { title, description, category, content } = req.body as Record<string, string>;
  if (!title?.trim()) {
    res.status(400).json({ error: 'Title is required' });
    return;
  }
  if (!resourcesService.isValidCategory(category)) {
    res.status(400).json({ error: 'Invalid resource category' });
    return;
  }
  const file = req.file;
  let fileUrl: string | undefined;
  let fileName: string | undefined;
  let mimeType: string | undefined;
  if (file) {
    try {
      fileUrl = await uploadResourceFile(file.buffer, file.originalname, file.mimetype);
      fileName = file.originalname;
      mimeType = file.mimetype || 'application/octet-stream';
    } catch (uploadErr: unknown) {
      res.status(503).json({ error: (uploadErr as Error).message });
      return;
    }
  }
  try {
    const row = await resourcesService.create(req.user!.userId, {
      title,
      description,
      category: category as resourcesService.ResourceCategory,
      fileUrl,
      fileName,
      mimeType,
      content,
    });
    const withCreator = await resourcesService.findById(row.id);
    res.status(201).json({ resource: toResourceDto(withCreator ?? row) });
  } catch (e: unknown) {
    res.status(400).json({ error: (e as Error).message });
  }
}

export async function create(req: Request, res: Response): Promise<void> {
  const { title, description, category, fileUrl, fileName, mimeType, content, tags } = req.body;
  if (!resourcesService.isValidCategory(category)) {
    res.status(400).json({ error: 'Invalid resource category' });
    return;
  }
  try {
    const row = await resourcesService.create(req.user!.userId, {
      title,
      description,
      category,
      fileUrl,
      fileName,
      mimeType,
      content,
      tags,
    });
    const withCreator = await resourcesService.findById(row.id);
    res.status(201).json({ resource: toResourceDto(withCreator ?? row) });
  } catch (e: unknown) {
    res.status(400).json({ error: (e as Error).message });
  }
}

/** Edit a resource, optionally replacing its file (multipart — same upload path as create). */
export async function updateWithFile(req: Request, res: Response): Promise<void> {
  const { title, description, category, content } = req.body as Record<string, string>;
  if (category && !resourcesService.isValidCategory(category)) {
    res.status(400).json({ error: 'Invalid resource category' });
    return;
  }
  const file = req.file;
  let fileUrl: string | undefined;
  let fileName: string | undefined;
  let mimeType: string | undefined;
  if (file) {
    try {
      fileUrl = await uploadResourceFile(file.buffer, file.originalname, file.mimetype);
      fileName = file.originalname;
      mimeType = file.mimetype || 'application/octet-stream';
    } catch (uploadErr: unknown) {
      res.status(503).json({ error: (uploadErr as Error).message });
      return;
    }
  }
  try {
    const row = await resourcesService.update(req.params.id, {
      title,
      description,
      category: category as resourcesService.ResourceCategory | undefined,
      fileUrl,
      fileName,
      mimeType,
      content,
    });
    if (!row) {
      res.status(404).json({ error: 'Resource not found' });
      return;
    }
    const withCreator = await resourcesService.findById(row.id);
    res.json({ resource: toResourceDto(withCreator ?? row) });
  } catch (e: unknown) {
    res.status(400).json({ error: (e as Error).message });
  }
}

export async function update(req: Request, res: Response): Promise<void> {
  const { title, description, category, fileUrl, fileName, mimeType, content, tags } = req.body;
  if (category && !resourcesService.isValidCategory(category)) {
    res.status(400).json({ error: 'Invalid resource category' });
    return;
  }
  try {
    const row = await resourcesService.update(req.params.id, {
      title,
      description,
      category,
      fileUrl,
      fileName,
      mimeType,
      content,
      tags,
    });
    if (!row) {
      res.status(404).json({ error: 'Resource not found' });
      return;
    }
    const withCreator = await resourcesService.findById(row.id);
    res.json({ resource: toResourceDto(withCreator ?? row) });
  } catch (e: unknown) {
    res.status(400).json({ error: (e as Error).message });
  }
}

export async function remove(req: Request, res: Response): Promise<void> {
  const ok = await resourcesService.remove(req.params.id);
  if (!ok) {
    res.status(404).json({ error: 'Resource not found' });
    return;
  }
  res.json({ ok: true });
}

export async function assign(req: Request, res: Response): Promise<void> {
  const { childId, notes } = req.body;
  const row = await resourcesService.assignToChild(
    req.params.id,
    childId,
    req.user!.userId,
    req.user!.role,
    notes
  );
  if (!row) {
    res.status(400).json({ error: 'Unable to assign resource. Check child access.' });
    return;
  }
  res.status(201).json({
    assignment: {
      id: row.id,
      childId: row.child_id,
      resourceId: row.resource_id,
      notes: row.notes,
      assignedAt: row.assigned_at,
    },
  });
}

export async function unassign(req: Request, res: Response): Promise<void> {
  const ok = await resourcesService.unassign(req.params.assignmentId, req.user!.userId, req.user!.role);
  if (!ok) {
    res.status(404).json({ error: 'Assignment not found or access denied' });
    return;
  }
  res.json({ ok: true });
}

export async function listByChild(req: Request, res: Response): Promise<void> {
  const rows = await resourcesService.listForChild(req.params.childId, req.user!.userId, req.user!.role);
  if (rows === null) {
    res.status(404).json({ error: 'Child not found or access denied' });
    return;
  }
  res.json({
    resources: rows.map((r) => ({
      ...toResourceDto(r, { includeFile: false }),
      assignmentId: r.assignment_id,
      assignmentNotes: r.assignment_notes,
      assignedAt: r.assigned_at,
      assignerName: r.assigner_name,
    })),
  });
}

export function listCategories(_req: Request, res: Response): void {
  res.json({
    categories: resourcesService.RESOURCE_CATEGORIES.map((id) => ({
      id,
      label: categoryLabel(id),
    })),
  });
}

function categoryLabel(id: resourcesService.ResourceCategory): string {
  const labels: Record<resourcesService.ResourceCategory, string> = {
    pdf: 'PDFs',
    worksheet: 'Worksheets',
    visual_schedule: 'Visual Schedules',
    flashcard: 'Flashcards',
    social_story: 'Social Stories',
  };
  return labels[id];
}
