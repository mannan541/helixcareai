import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authMiddleware } from '../../middleware/auth';
import { requireRoles, requireAdmin } from '../../middleware/roles';
import { validate } from '../../middleware/validate';
import * as assessmentsController from './assessments.controller';
import * as customTemplatesController from './customTemplates.controller';

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
    query('customTemplateId').optional().isUUID(),
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

// Custom assessment templates — must be registered before the generic /:id route below.
router.get(
  '/custom-templates',
  requireRoles('admin', 'therapist'),
  validate([query('activeOnly').optional().isBoolean()]),
  customTemplatesController.list
);
router.get(
  '/custom-templates/:id',
  requireRoles('admin', 'therapist'),
  validate([param('id').isUUID()]),
  customTemplatesController.getOne
);
router.post(
  '/custom-templates',
  requireRoles('admin', 'therapist'),
  validate([
    body('name').trim().notEmpty(),
    body('description').optional().isString(),
    body('questions').isArray({ min: 1 }),
  ]),
  customTemplatesController.create
);
router.patch(
  '/custom-templates/:id',
  requireAdmin,
  validate([
    param('id').isUUID(),
    body('name').optional().trim().notEmpty(),
    body('description').optional().isString(),
    body('questions').optional().isArray({ min: 1 }),
    body('isActive').optional().isBoolean(),
  ]),
  customTemplatesController.update
);
router.delete(
  '/custom-templates/:id',
  requireAdmin,
  validate([param('id').isUUID()]),
  customTemplatesController.remove
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
    body('customTemplateId').optional().isUUID(),
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
