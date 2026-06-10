import { Router } from 'express';
import { param, query } from 'express-validator';
import { authMiddleware } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/asyncHandler';
import { validate } from '../../middleware/validate';
import * as reportsController from './reports.controller';

const router = Router();
router.use(authMiddleware);

router.get(
  '/child/:childId',
  validate([
    param('childId').isUUID(),
    query('from').matches(/^\d{4}-\d{2}-\d{2}$/),
    query('to').matches(/^\d{4}-\d{2}-\d{2}$/),
    query('format').optional().isIn(['json', 'csv']),
  ]),
  asyncHandler(reportsController.getChildReport)
);

export default router;
