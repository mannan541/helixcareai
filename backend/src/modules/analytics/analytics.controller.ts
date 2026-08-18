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

export async function getTherapistAnalyticsList(req: Request, res: Response): Promise<void> {
  const { from, to } = req.query as { from?: string; to?: string };
  const therapists = await analyticsService.getTherapistAnalytics({ from, to });
  res.json({ therapists });
}

export async function getTherapistAnalyticsOne(req: Request, res: Response): Promise<void> {
  const { therapistId } = req.params;
  const { role, userId } = req.user!;
  if (role === 'therapist' && therapistId !== userId) {
    res.status(403).json({ error: 'You can only view your own analytics' });
    return;
  }
  const { from, to } = req.query as { from?: string; to?: string };
  const rows = await analyticsService.getTherapistAnalytics({ from, to, therapistId });
  if (rows.length === 0) {
    res.status(404).json({ error: 'Therapist not found' });
    return;
  }
  res.json({ therapist: rows[0] });
}

export async function getSessionsMissingNotes(req: Request, res: Response): Promise<void> {
  const { role, userId } = req.user!;
  const { from, to } = req.query as { from?: string; to?: string };
  const therapistId = role === 'therapist' ? userId : (req.query.therapistId as string | undefined);
  const sessions = await analyticsService.getSessionsMissingNotes({ from, to, therapistId });
  res.json({ sessions });
}

export async function getChildrenGoalsStale(req: Request, res: Response): Promise<void> {
  const { role, userId } = req.user!;
  const therapistId = role === 'therapist' ? userId : (req.query.therapistId as string | undefined);
  const days = req.query.days ? parseInt(req.query.days as string, 10) : undefined;
  const children = await analyticsService.getStaleGoalChildren({ therapistId, lookbackDays: days });
  res.json({ children });
}

export async function getChildrenNotAttended(req: Request, res: Response): Promise<void> {
  const days = req.query.days ? parseInt(req.query.days as string, 10) : undefined;
  const children = await analyticsService.getChildrenNotAttendedRecently(days);
  res.json({ children });
}

export async function getClinicSummary(req: Request, res: Response): Promise<void> {
  const { from, to } = req.query as { from?: string; to?: string };
  const summary = await analyticsService.getClinicSummary({ from, to });
  res.json({ summary });
}
