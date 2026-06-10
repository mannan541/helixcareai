import { Router } from 'express';
import { body, param } from 'express-validator';
import { authMiddleware } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as aiController from './aiController';
import * as reindexController from './reindex.controller';

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

router.post(
  '/reindex/child/:childId',
  validate([param('childId').isUUID()]),
  reindexController.reindexChild
);

router.post('/reindex/all', reindexController.reindexAll);

router.post('/sync-missing', reindexController.syncMissingAll);

export default router;
