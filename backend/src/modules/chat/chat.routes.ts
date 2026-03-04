import { Router } from 'express';
import { body, param } from 'express-validator';
import { authMiddleware } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as chatController from './chat.controller';

const router = Router();
router.use(authMiddleware);

router.post(
  '/ask',
  validate([
    body('childId').isUUID(),
    body('question').trim().notEmpty(),
  ]),
  chatController.ask
);

router.get(
  '/history/:childId',
  validate([param('childId').isUUID()]),
  chatController.history
);

export default router;
