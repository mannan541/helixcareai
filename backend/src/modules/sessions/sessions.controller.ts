import { Request, Response } from 'express';
import * as sessionsService from './sessions.service';
import * as childrenService from '../children/children.service';
import { createEmbeddingForSession } from '../ai/ai.service';
import * as notificationsEmit from '../notifications/notifications.emit';

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
    appointmentId: s.appointment_id ?? undefined,
  };
}

function toSessionDtoWithUser(s: sessionsService.SessionWithUserRow, requesterRole?: string) {
  const base = toSessionDto(s);
  const createdByUser =
    s._cb_id != null
      ? { id: s._cb_id, fullName: s._cb_full_name ?? '', email: s._cb_email ?? '', title: s._cb_title ?? null }
      : undefined;
  const showTherapistMobile = requesterRole !== 'parent' || s._th_show_mobile_to_parents;
  const therapistUser =
    s._th_id != null
      ? {
        id: s._th_id,
        fullName: s._th_full_name ?? '',
        email: s._th_email ?? '',
        title: s._th_title ?? null,
        mobileNumber: showTherapistMobile && s._th_mobile_number ? s._th_mobile_number : undefined,
      }
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
  res.json({ sessions: sessions.map((s) => toSessionDtoWithUser(s, req.user!.role)), total, limit, offset });
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
  res.json({ session: toSessionDtoWithUser(session, req.user!.role) });
}

export async function create(req: Request, res: Response): Promise<void> {
  console.log('[sessionsController.create] start', { userId: req.user?.userId, role: req.user?.role, body: req.body });
  if (req.user!.role === 'parent') {
    console.warn('[sessionsController.create] parent role not allowed');
    res.status(403).json({ error: 'Only admin or therapist can create a session' });
    return;
  }
  const { childId, sessionDate, therapistId, durationMinutes, notesText, structuredMetrics, appointmentId } = req.body;
  const child = await childrenService.findById(childId);
  if (!child) {
    res.status(404).json({ error: 'Child not found' });
    return;
  }
  const canAccess = childrenService.canAccessChild(child.user_id, req.user!.userId, req.user!.role);
  if (!canAccess) {
    console.warn('[sessionsController.create] canAccessChild denied', { childUserId: child.user_id, userId: req.user!.userId, role: req.user!.role });
    res.status(403).json({ error: 'Access denied' });
    return;
  }
  console.log('[sessionsController.create] access granted, calling sessionsService.create');
  const session = await sessionsService.create(req.user!.userId, {
    childId,
    sessionDate,
    therapistId: therapistId ?? null,
    durationMinutes,
    notesText,
    structuredMetrics,
    appointmentId: appointmentId ?? null,
  });
  console.log('[sessionsController.create] session created', { sessionId: session.id });
  if (notesText && notesText.trim()) {
    try {
      await createEmbeddingForSession(session.id, session.child_id, notesText.trim());
    } catch (e) {
      console.error('Failed to create session embedding:', e);
    }
  }
  const childName = `${child.first_name} ${child.last_name}`.trim() || 'Child';
  notificationsEmit.notifySessionLogged({
    sessionId: session.id,
    childId: child.id,
    childName,
    sessionDate,
    createdByUserId: req.user!.userId,
    createdByRole: req.user!.role,
    therapistId: session.therapist_id,
  }).catch((err) => console.error('[notifications] notifySessionLogged failed:', err));
  const withUser = await sessionsService.findByIdWithUser(session.id);
  console.log('[sessionsController.create] sending success response', { withUser: !!withUser });
  res.status(201).json({ session: withUser ? toSessionDtoWithUser(withUser, req.user!.role) : toSessionDto(session) });
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
  res.json({ session: withUser ? toSessionDtoWithUser(withUser, req.user!.role) : toSessionDto(updated) });
}

export async function remove(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  if (req.user!.role !== 'admin') {
    res.status(403).json({ error: 'Only admin can delete a session' });
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
  if (req.user!.role === 'parent') {
    notificationsEmit.notifyParentCommentOnSession({
      sessionId: id,
      parentName: created._u_full_name || 'A parent',
      commentSnippet: comment.trim(),
    }).catch((err) => console.error('[notifications] notifyParentCommentOnSession failed:', err));
  } else if (req.user!.role === 'therapist' || req.user!.role === 'admin') {
    notificationsEmit.notifyStaffCommentOnSession({
      sessionId: id,
      authorName: created._u_full_name || (req.user!.role === 'admin' ? 'An admin' : 'The therapist'),
      authorRole: req.user!.role,
      commentSnippet: comment.trim(),
    }).catch((err) => console.error('[notifications] notifyStaffCommentOnSession failed:', err));
  }
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

export async function updateComment(req: Request, res: Response): Promise<void> {
  const { id: sessionId, commentId } = req.params;
  const allowed = await sessionsService.canAccessSession(sessionId, req.user!.userId, req.user!.role);
  if (!allowed) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }
  const { comment } = req.body;
  if (!comment || typeof comment !== 'string' || !comment.trim()) {
    res.status(400).json({ error: 'Comment text is required' });
    return;
  }
  const updated = await sessionsService.updateSessionComment(commentId, req.user!.userId, comment.trim());
  if (!updated) {
    res.status(404).json({ error: 'Comment not found or you can only edit your own notes' });
    return;
  }
  res.json({
    comment: {
      id: updated.id,
      sessionId: updated.session_id,
      userId: updated.user_id,
      comment: updated.comment,
      createdAt: updated.created_at,
      user: { id: updated._u_id, fullName: updated._u_full_name, email: updated._u_email },
    },
  });
}

export async function deleteComment(req: Request, res: Response): Promise<void> {
  const { id: sessionId, commentId } = req.params;
  const allowed = await sessionsService.canAccessSession(sessionId, req.user!.userId, req.user!.role);
  if (!allowed) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }
  const deleted = await sessionsService.deleteSessionComment(commentId, req.user!.userId);
  if (!deleted) {
    res.status(404).json({ error: 'Comment not found or you can only delete your own notes' });
    return;
  }
  res.status(204).send();
}
