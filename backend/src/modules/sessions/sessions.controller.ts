import { Request, Response } from 'express';
import * as sessionsService from './sessions.service';
import * as childrenService from '../children/children.service';
import { createEmbeddingForSession } from '../ai/ai.service';

function toSessionDto(s: sessionsService.SessionRow) {
  return {
    id: s.id,
    childId: s.child_id,
    createdBy: s.created_by,
    sessionDate: s.session_date,
    durationMinutes: s.duration_minutes,
    notesText: s.notes_text,
    structuredMetrics: s.structured_metrics,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  };
}

export async function listByChild(req: Request, res: Response): Promise<void> {
  const { childId } = req.params;
  const child = await childrenService.findById(childId);
  if (!child) {
    res.status(404).json({ error: 'Child not found' });
    return;
  }
  if (!childrenService.canAccessChild(child.user_id, req.user!.userId, req.user!.role)) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }
  const sessions = await sessionsService.findByChildId(childId);
  res.json({ sessions: sessions.map(toSessionDto) });
}

export async function getOne(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const session = await sessionsService.findById(id);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  const allowed = await sessionsService.canAccessSession(id, req.user!.userId, req.user!.role);
  if (!allowed) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }
  res.json({ session: toSessionDto(session) });
}

export async function create(req: Request, res: Response): Promise<void> {
  const { childId, sessionDate, durationMinutes, notesText, structuredMetrics } = req.body;
  const child = await childrenService.findById(childId);
  if (!child) {
    res.status(404).json({ error: 'Child not found' });
    return;
  }
  if (!childrenService.canAccessChild(child.user_id, req.user!.userId, req.user!.role)) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }
  const session = await sessionsService.create(req.user!.userId, {
    childId,
    sessionDate,
    durationMinutes,
    notesText,
    structuredMetrics,
  });
  if (notesText && notesText.trim()) {
    try {
      await createEmbeddingForSession(session.id, session.child_id, notesText.trim());
    } catch (e) {
      console.error('Failed to create session embedding:', e);
    }
  }
  res.status(201).json({ session: toSessionDto(session) });
}

export async function update(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const allowed = await sessionsService.canAccessSession(id, req.user!.userId, req.user!.role);
  if (!allowed) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }
  const { sessionDate, durationMinutes, notesText, structuredMetrics } = req.body;
  const updated = await sessionsService.update(id, {
    sessionDate,
    durationMinutes,
    notesText,
    structuredMetrics,
  });
  if (!updated) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  res.json({ session: toSessionDto(updated) });
}

export async function remove(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const allowed = await sessionsService.canAccessSession(id, req.user!.userId, req.user!.role);
  if (!allowed) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }
  await sessionsService.remove(id);
  res.status(204).send();
}
