import { Router } from 'express';
import { body } from 'express-validator';
import { authMiddleware } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as aiController from './aiController';

const router = Router();
router.use(authMiddleware);

router.post(
  '/chat',
  validate([
    body('childId').isUUID(),
    body('question').trim().notEmpty(),
  ]),
  aiController.chat
);

export default router;
