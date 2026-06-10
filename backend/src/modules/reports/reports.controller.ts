import { Request, Response } from 'express';
import * as reportsService from './reports.service';

export async function getChildReport(req: Request, res: Response): Promise<void> {
  const { childId } = req.params;
  const from = (req.query.from as string)?.trim();
  const to = (req.query.to as string)?.trim();
  const format = ((req.query.format as string) ?? 'json').toLowerCase();

  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  if (!from || !to) {
    res.status(400).json({ error: 'Query params "from" and "to" (YYYY-MM-DD) are required' });
    return;
  }

  const report = await reportsService.generateChildReport(
    childId,
    from,
    to,
    req.user.userId,
    req.user.role
  );

  if (!report) {
    res.status(404).json({ error: 'Child not found or access denied' });
    return;
  }

  if (format === 'csv') {
    const csv = reportsService.reportToCsv(report);
    const safeName = report.child.fullName.replace(/[^a-zA-Z0-9_-]/g, '_');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="child_report_${safeName}_${from}_${to}.csv"`
    );
    res.send(csv);
    return;
  }

  res.json({ report });
}
