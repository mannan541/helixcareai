import { Router } from 'express';
import { param, query } from 'express-validator';
import { authMiddleware } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/asyncHandler';
import { validate } from '../../middleware/validate';
import * as notificationsController from './notifications.controller';

const router = Router();
router.use(authMiddleware);

router.get(
  '/',
  validate([
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
    query('unreadOnly').optional().isIn(['true', 'false', '1', '0']),
  ]),
  asyncHandler(notificationsController.list)
);

router.get('/unread-count', asyncHandler(notificationsController.getUnreadCount));

router.put(
  '/:id/read',
  validate([param('id').isUUID()]),
  asyncHandler(notificationsController.markAsRead)
);

router.post('/read-all', asyncHandler(notificationsController.markAllAsRead));

export default router;
