import { Request, Response } from 'express';
import * as childrenService from '../children/children.service';
import * as therapyEmbeddingStorage from './therapyEmbeddingStorage';

export async function reindexChild(req: Request, res: Response): Promise<void> {
  const { childId } = req.params;
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const child = await childrenService.findById(childId);
  if (!child) {
    res.status(404).json({ error: 'Child not found' });
    return;
  }
  if (!childrenService.canAccessChild(child.user_id, req.user.userId, req.user.role)) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }
  if (req.user.role === 'parent') {
    res.status(403).json({ error: 'Only therapists and admins can reindex session data' });
    return;
  }

  const result = await therapyEmbeddingStorage.reindexChildSessions(childId);
  res.json({
    message: 'Session data reindexed for AI',
    childId,
    ...result,
  });
}

export async function reindexAll(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  if (req.user.role !== 'admin') {
    res.status(403).json({ error: 'Only admins can reindex all children' });
    return;
  }

  const result = await therapyEmbeddingStorage.reindexAllChildren();
  res.json({
    message: 'All session data reindexed for AI',
    ...result,
  });
}

export async function syncMissingAll(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  if (req.user.role !== 'admin' && req.user.role !== 'therapist') {
    res.status(403).json({ error: 'Only therapists and admins can sync session data' });
    return;
  }

  const result = await therapyEmbeddingStorage.syncAllMissingSessionEmbeddings();
  res.json({
    message: 'Missing session embeddings synced for AI',
    ...result,
  });
}
