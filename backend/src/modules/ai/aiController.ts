import { Request, Response } from 'express';
import * as ragService from './ragService';
import * as childrenService from '../children/children.service';

export async function chat(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const { childId, question } = req.body as { childId: string; question: string };
  if (!childId || typeof question !== 'string') {
    res.status(400).json({ error: 'childId and question are required' });
    return;
  }

  const child = await childrenService.findById(childId);
  if (!child) {
    res.status(404).json({ error: 'Child not found' });
    return;
  }
  if (!childrenService.canAccessChild(child.user_id, req.user.userId, req.user.role)) {
    res.status(403).json({ error: 'Access denied to this child' });
    return;
  }

  try {
    const answer = await ragService.askChildAssistant(childId, question.trim());
    res.json({ answer });
  } catch (e: unknown) {
    const err = e as Error & { statusCode?: number };
    const status = err.statusCode ?? 500;
    const message = err.message ?? 'AI chat request failed';
    res.status(status).json({ error: message });
  }
}
