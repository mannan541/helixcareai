import { Request, Response } from 'express';
import * as notificationsService from './notifications.service';

export async function list(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 100);
  const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
  const unreadOnly = req.query.unreadOnly === 'true' || req.query.unreadOnly === '1';
  const { notifications, total } = await notificationsService.listByUserId(userId, {
    limit,
    offset,
    unreadOnly,
  });
  res.json({
    notifications: notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      readAt: n.read_at,
      createdAt: n.created_at,
      meta: n.meta,
    })),
    total,
    limit,
    offset,
  });
}

export async function getUnreadCount(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const count = await notificationsService.getUnreadCount(userId);
  res.json({ count });
}

export async function markAsRead(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const id = req.params.id as string;
  const updated = await notificationsService.markAsRead(id, userId);
  if (!updated) {
    res.status(404).json({ error: 'Notification not found or already read' });
    return;
  }
  res.json({ ok: true });
}

export async function markAllAsRead(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const count = await notificationsService.markAllAsRead(userId);
  res.json({ marked: count });
}
