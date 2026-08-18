import { Router } from 'express';
import { param, query } from 'express-validator';
import { authMiddleware } from '../../middleware/auth';
import { requireAdmin, requireRoles } from '../../middleware/roles';
import { validate } from '../../middleware/validate';
import * as analyticsController from './analytics.controller';

const router = Router();
router.use(authMiddleware);

router.get(
  '/child/:childId',
  validate([param('childId').isUUID()]),
  analyticsController.getChildMetrics
);

router.get(
  '/therapists',
  requireAdmin,
  validate([query('from').optional().isISO8601(), query('to').optional().isISO8601()]),
  analyticsController.getTherapistAnalyticsList
);

router.get(
  '/therapists/:therapistId',
  requireRoles('admin', 'therapist'),
  validate([
    param('therapistId').isUUID(),
    query('from').optional().isISO8601(),
    query('to').optional().isISO8601(),
  ]),
  analyticsController.getTherapistAnalyticsOne
);

router.get(
  '/sessions/missing-notes',
  requireRoles('admin', 'therapist'),
  validate([
    query('from').optional().isISO8601(),
    query('to').optional().isISO8601(),
    query('therapistId').optional().isUUID(),
  ]),
  analyticsController.getSessionsMissingNotes
);

router.get(
  '/children/goals-stale',
  requireRoles('admin', 'therapist'),
  validate([query('therapistId').optional().isUUID(), query('days').optional().isInt({ min: 1 })]),
  analyticsController.getChildrenGoalsStale
);

router.get(
  '/children/not-attended',
  requireRoles('admin', 'therapist'),
  validate([query('days').optional().isInt({ min: 1 })]),
  analyticsController.getChildrenNotAttended
);

router.get(
  '/clinic-summary',
  requireAdmin,
  validate([query('from').optional().isISO8601(), query('to').optional().isISO8601()]),
  analyticsController.getClinicSummary
);

export default router;
