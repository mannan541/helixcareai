import { Router } from 'express';
import { body, param } from 'express-validator';
import { authMiddleware } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as sessionsController from './sessions.controller';

const router = Router();
router.use(authMiddleware);

router.get(
  '/child/:childId',
  validate([param('childId').isUUID()]),
  sessionsController.listByChild
);

router.get(
  '/:id',
  validate([param('id').isUUID()]),
  sessionsController.getOne
);

router.post(
  '/',
  validate([
    body('childId').isUUID(),
    body('sessionDate').isISO8601(),
    body('therapistId').optional().isUUID(),
    body('durationMinutes').optional().isInt({ min: 0 }),
    body('notesText').optional().isString(),
    body('structuredMetrics').optional().isObject(),
  ]),
  sessionsController.create
);

router.patch(
  '/:id',
  validate([
    param('id').isUUID(),
    body('therapistId').optional().custom((v) => v == null || (typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v))),
    body('sessionDate').optional().isISO8601(),
    body('durationMinutes').optional().isInt({ min: 0 }),
    body('notesText').optional().isString(),
    body('structuredMetrics').optional().isObject(),
  ]),
  sessionsController.update
);

router.delete(
  '/:id',
  validate([param('id').isUUID()]),
  sessionsController.remove
);

router.get(
  '/:id/comments',
  validate([param('id').isUUID()]),
  sessionsController.listComments
);

router.post(
  '/:id/comments',
  validate([param('id').isUUID(), body('comment').isString().notEmpty().trim()]),
  sessionsController.addComment
);

export default router;
