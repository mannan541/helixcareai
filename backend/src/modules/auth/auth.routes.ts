import { Router } from 'express';
import { body } from 'express-validator';
import { authMiddleware } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/asyncHandler';
import { validate } from '../../middleware/validate';
import * as authController from './auth.controller';

const router = Router();

router.post(
  '/register',
  validate([
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('fullName').trim().notEmpty(),
    // Admin accounts cannot be self-registered — only created by an existing admin (see admin.routes.ts).
    body('role').isIn(['therapist', 'parent']),
  ]),
  asyncHandler(authController.register)
);

router.post(
  '/login',
  validate([
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ]),
  asyncHandler(authController.login)
);

router.get('/me', authMiddleware, asyncHandler(authController.me));
router.get('/dashboard/counts', authMiddleware, asyncHandler(authController.getDashboardCounts));
router.get('/therapists', authMiddleware, asyncHandler(authController.listTherapists));

router.patch(
  '/profile',
  authMiddleware,
  validate([
    body('fullName').optional().trim().notEmpty(),
    body('currentPassword').optional().isString(),
    body('password').optional().isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('mobileNumber').optional({ nullable: true }).isString(),
    body('showMobileToParents').optional().isBoolean(),
  ]),
  asyncHandler(authController.updateProfile)
);

export default router;
