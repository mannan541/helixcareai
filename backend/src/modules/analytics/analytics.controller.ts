import { Request, Response } from 'express';
import * as analyticsService from './analytics.service';

export async function getChildMetrics(req: Request, res: Response): Promise<void> {
  const { childId } = req.params;
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const sessions = await analyticsService.getSessionMetricsForChild(
    childId,
    req.user.userId,
    req.user.role
  );
  res.json({
    sessions: sessions.map((s) => ({
      id: s.id,
      sessionDate: s.session_date,
      durationMinutes: s.duration_minutes,
      structuredMetrics: s.structured_metrics,
    })),
  });
}
