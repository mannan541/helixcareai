import { Request, Response } from 'express';
import * as sessionsService from './sessions.service';
import * as childrenService from '../children/children.service';
import { createEmbeddingForSession } from '../ai/ai.service';

function toSessionDto(s: sessionsService.SessionRow) {
  return {
    id: s.id,
    childId: s.child_id,
    createdBy: s.created_by,
    therapistId: s.therapist_id ?? undefined,
    sessionDate: s.session_date,
    durationMinutes: s.duration_minutes,
    notesText: s.notes_text,
    structuredMetrics: s.structured_metrics,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
    updatedBy: s.updated_by ?? undefined,
  };
}

function toSessionDtoWithUser(s: sessionsService.SessionWithUserRow) {
  const base = toSessionDto(s);
  const createdByUser =
    s._cb_id != null
      ? { id: s._cb_id, fullName: s._cb_full_name ?? '', email: s._cb_email ?? '', title: s._cb_title ?? null }
      : undefined;
  const therapistUser =
    s._th_id != null
      ? { id: s._th_id, fullName: s._th_full_name ?? '', email: s._th_email ?? '', title: s._th_title ?? null }
      : undefined;
  const updatedByUser =
    s._ub_id != null
      ? { id: s._ub_id, fullName: s._ub_full_name ?? '', email: s._ub_email ?? '' }
      : undefined;
  return { ...base, createdByUser, therapistUser, updatedByUser };
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
  const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 100);
  const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
  const { rows: sessions, total } = await sessionsService.findByChildIdWithUser(childId, { limit, offset });
  res.json({ sessions: sessions.map(toSessionDtoWithUser), total, limit, offset });
}

export async function getOne(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const session = await sessionsService.findByIdWithUser(id);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  const allowed = await sessionsService.canAccessSession(id, req.user!.userId, req.user!.role);
  if (!allowed) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }
  res.json({ session: toSessionDtoWithUser(session) });
}

export async function create(req: Request, res: Response): Promise<void> {
  if (req.user!.role === 'parent') {
    res.status(403).json({ error: 'Only admin or therapist can create a session' });
    return;
  }
  const { childId, sessionDate, therapistId, durationMinutes, notesText, structuredMetrics } = req.body;
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
    therapistId: therapistId ?? null,
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
  const withUser = await sessionsService.findByIdWithUser(session.id);
  res.status(201).json({ session: withUser ? toSessionDtoWithUser(withUser) : toSessionDto(session) });
}

export async function update(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  if (req.user!.role === 'parent') {
    res.status(403).json({ error: 'Only admin or therapist can edit a session' });
    return;
  }
  const allowed = await sessionsService.canAccessSession(id, req.user!.userId, req.user!.role);
  if (!allowed) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }
  const { therapistId, sessionDate, durationMinutes, notesText, structuredMetrics } = req.body;
  const updated = await sessionsService.update(id, {
    updatedBy: req.user!.userId,
    therapistId: therapistId !== undefined ? therapistId : undefined,
    sessionDate,
    durationMinutes,
    notesText,
    structuredMetrics,
  });
  if (!updated) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  const withUser = await sessionsService.findByIdWithUser(updated.id);
  res.json({ session: withUser ? toSessionDtoWithUser(withUser) : toSessionDto(updated) });
}

export async function remove(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  if (req.user!.role === 'parent') {
    res.status(403).json({ error: 'Only admin or therapist can delete a session' });
    return;
  }
  const allowed = await sessionsService.canAccessSession(id, req.user!.userId, req.user!.role);
  if (!allowed) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }
  await sessionsService.remove(id, req.user!.userId);
  res.status(204).send();
}

export async function listComments(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const allowed = await sessionsService.canAccessSession(id, req.user!.userId, req.user!.role);
  if (!allowed) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }
  const comments = await sessionsService.listSessionComments(id);
  res.json({
    comments: comments.map((c) => ({
      id: c.id,
      sessionId: c.session_id,
      userId: c.user_id,
      comment: c.comment,
      createdAt: c.created_at,
      user: { id: c._u_id, fullName: c._u_full_name, email: c._u_email },
    })),
  });
}

export async function addComment(req: Request, res: Response): Promise<void> {
  if (req.user!.role !== 'parent') {
    res.status(403).json({ error: 'Only parents can add notes on a session' });
    return;
  }
  const { id } = req.params;
  const allowed = await sessionsService.canAccessSession(id, req.user!.userId, req.user!.role);
  if (!allowed) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }
  const { comment } = req.body;
  if (!comment || typeof comment !== 'string' || !comment.trim()) {
    res.status(400).json({ error: 'Comment text is required' });
    return;
  }
  const created = await sessionsService.addSessionComment(id, req.user!.userId, comment.trim());
  res.status(201).json({
    comment: {
      id: created.id,
      sessionId: created.session_id,
      userId: created.user_id,
      comment: created.comment,
      createdAt: created.created_at,
      user: { id: created._u_id, fullName: created._u_full_name, email: created._u_email },
    },
  });
}
