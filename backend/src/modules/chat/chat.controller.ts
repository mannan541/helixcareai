import { Request, Response } from 'express';
import * as chatService from './chat.service';

export async function ask(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const { childId, question } = req.body as { childId: string; question: string };
  try {
    const { answer } = await chatService.ask(req.user.userId, req.user.role, childId, question.trim());
    res.json({ answer });
  } catch (e: unknown) {
    const err = e as { statusCode?: number; message?: string };
    res.status(err.statusCode ?? 500).json({ error: err.message ?? 'Chat request failed' });
  }
}

export async function history(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const { childId } = req.params;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
  const logs = await chatService.getHistory(req.user.userId, childId, limit);
  res.json({
    messages: logs.reverse().map((l) => ({
      id: l.id,
      role: l.role,
      content: l.content,
      createdAt: l.created_at,
    })),
  });
}
