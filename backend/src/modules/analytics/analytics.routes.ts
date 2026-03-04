import { Router } from 'express';
import { param } from 'express-validator';
import { authMiddleware } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as analyticsController from './analytics.controller';

const router = Router();
router.use(authMiddleware);

router.get(
  '/child/:childId',
  validate([param('childId').isUUID()]),
  analyticsController.getChildMetrics
);

export default router;
