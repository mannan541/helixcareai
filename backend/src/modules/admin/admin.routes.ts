import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authMiddleware } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/roles';
import { asyncHandler } from '../../middleware/asyncHandler';
import { validate } from '../../middleware/validate';
import * as adminController from './admin.controller';

const router = Router();
router.use(authMiddleware);
router.use(requireAdmin);

router.get('/dashboard/counts', asyncHandler(adminController.getDashboardCounts));

router.post(
  '/users',
  validate([
    body('email').isEmail().normalizeEmail(),
    body('fullName').trim().notEmpty(),
    body('role').isIn(['therapist', 'parent']),
    body('title').optional().isString(),
    body('childIds').optional().isArray(),
    body('childIds.*').optional().isUUID(),
  ]),
  asyncHandler(adminController.createUser)
);

router.get(
  '/users',
  validate([
    query('role').optional().isIn(['admin', 'therapist', 'parent']),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
    query('q').optional().isString(),
  ]),
  asyncHandler(adminController.listUsers)
);

const updateUserValidations = [
  param('id').isUUID(),
  body('fullName').optional().trim().notEmpty(),
  body('title').optional({ nullable: true }).custom((val) => val === null || typeof val === 'string'),
  body('password').optional().isString().isLength({ min: 8 }),
];

router
  .route('/users/:id')
  .get(validate([param('id').isUUID()]), asyncHandler(adminController.getUser))
  .put(validate(updateUserValidations), asyncHandler(adminController.updateUser))
  .patch(validate(updateUserValidations), asyncHandler(adminController.updateUser));

export default router;
