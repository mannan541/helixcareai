import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authMiddleware } from '../../middleware/auth';
import { requireRoles } from '../../middleware/roles';
import { validate } from '../../middleware/validate';
import * as assessmentsController from './assessments.controller';

const router = Router();
router.use(authMiddleware);

router.get('/templates', assessmentsController.listTemplates);
router.get('/templates/:typeId', assessmentsController.getTemplateByType);

router.get(
  '/recent',
  requireRoles('admin', 'therapist'),
  validate([
    query('from').optional().isISO8601(),
    query('to').optional().isISO8601(),
    query('type').optional().isString(),
    query('q').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 200 }),
  ]),
  assessmentsController.listRecent
);

router.get(
  '/child/:childId',
  validate([param('childId').isUUID()]),
  assessmentsController.listByChild
);

router.get(
  '/:id',
  validate([param('id').isUUID()]),
  assessmentsController.getOne
);

router.post(
  '/',
  requireRoles('admin', 'therapist'),
  validate([
    body('childId').isUUID(),
    body('assessmentType').trim().notEmpty(),
    body('assessedAt').isISO8601(),
    body('respondent').optional().isString(),
    body('responses').isObject(),
    body('notes').optional().isString(),
  ]),
  assessmentsController.create
);

router.delete(
  '/:id',
  requireRoles('admin'),
  validate([param('id').isUUID()]),
  assessmentsController.remove
);

export default router;
