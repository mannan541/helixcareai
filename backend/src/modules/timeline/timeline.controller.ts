import { Request, Response } from 'express';
import * as timelineService from './timeline.service';

const VALID_TYPES = new Set<timelineService.TimelineItemType>([
  'appointment',
  'session',
  'attendance',
  'comment',
  'assessment',
  'goal_achievement',
]);

export async function getChildTimeline(req: Request, res: Response): Promise<void> {
  const { id: childId } = req.params;
  const limit = parseInt(req.query.limit as string, 10);
  const offset = parseInt(req.query.offset as string, 10);
  const from = typeof req.query.from === 'string' ? req.query.from : undefined;
  const to = typeof req.query.to === 'string' ? req.query.to : undefined;

  let types: timelineService.TimelineItemType[] | undefined;
  const rawTypes = req.query.types;
  if (typeof rawTypes === 'string' && rawTypes.trim()) {
    types = rawTypes
      .split(',')
      .map((t) => t.trim())
      .filter((t): t is timelineService.TimelineItemType => VALID_TYPES.has(t as timelineService.TimelineItemType));
  }

  const result = await timelineService.getChildTimeline(childId, req.user!.userId, req.user!.role, {
    limit: Number.isFinite(limit) ? limit : undefined,
    offset: Number.isFinite(offset) ? offset : undefined,
    from,
    to,
    types,
  });

  if (!result) {
    res.status(404).json({ error: 'Child not found or access denied' });
    return;
  }

  res.json(result);
}
