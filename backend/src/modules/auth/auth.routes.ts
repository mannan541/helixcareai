import { Router } from 'express';
import { body } from 'express-validator';
import { authMiddleware } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/roles';
import { validate } from '../../middleware/validate';
import * as authController from './auth.controller';

const router = Router();

router.post(
  '/register',
  validate([
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('fullName').trim().notEmpty(),
    body('role').isIn(['admin', 'therapist', 'parent']),
  ]),
  authController.register
);

router.post(
  '/login',
  validate([
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ]),
  authController.login
);

router.get('/me', authMiddleware, authController.me);

export default router;
