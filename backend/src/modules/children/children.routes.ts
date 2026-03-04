import { Router } from 'express';
import { body, param } from 'express-validator';
import { authMiddleware } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as childrenController from './children.controller';

const router = Router();
router.use(authMiddleware);

router.get('/', childrenController.list);

router.get(
  '/:id',
  validate([param('id').isUUID()]),
  childrenController.getOne
);

router.post(
  '/',
  validate([
    body('firstName').trim().notEmpty(),
    body('lastName').trim().notEmpty(),
    body('dateOfBirth').optional().isISO8601(),
    body('notes').optional().isString(),
  ]),
  childrenController.create
);

router.patch(
  '/:id',
  validate([
    param('id').isUUID(),
    body('firstName').optional().trim().notEmpty(),
    body('lastName').optional().trim().notEmpty(),
    body('dateOfBirth').optional().isISO8601(),
    body('notes').optional().isString(),
  ]),
  childrenController.update
);

router.delete(
  '/:id',
  validate([param('id').isUUID()]),
  childrenController.remove
);

export default router;
