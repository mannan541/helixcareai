import { Router } from 'express';
import { body, param } from 'express-validator';
import { authMiddleware } from '../../middleware/auth';
import { requireRoles } from '../../middleware/roles';
import { validate } from '../../middleware/validate';
import * as resourcesController from './resources.controller';
import { resourceFileUpload } from '../../middleware/upload';

const router = Router();
router.use(authMiddleware);

router.get('/categories', resourcesController.listCategories);

router.get(
  '/child/:childId',
  validate([param('childId').isUUID()]),
  resourcesController.listByChild
);

router.get('/', resourcesController.list);

router.post(
  '/upload',
  requireRoles('admin', 'therapist'),
  (req, res, next) => {
    resourceFileUpload.single('file')(req, res, (err: unknown) => {
      if (err) {
        const multerErr = err as { code?: string };
        if (multerErr.code === 'LIMIT_FILE_SIZE') {
          res.status(413).json({ error: 'File is too large. Maximum upload size is 4 MB.' });
          return;
        }
        res.status(400).json({ error: (err as Error).message || 'Upload failed' });
        return;
      }
      next();
    });
  },
  resourcesController.createWithFile
);

router.post(
  '/',
  requireRoles('admin', 'therapist'),
  validate([
    body('title').trim().notEmpty(),
    body('category').trim().notEmpty(),
    body('description').optional().isString(),
    body('fileUrl').optional().isString(),
    body('fileName').optional().isString(),
    body('mimeType').optional().isString(),
    body('content').optional().isString(),
    body('tags').optional().isArray(),
  ]),
  resourcesController.create
);

router.get(
  '/:id',
  validate([param('id').isUUID()]),
  resourcesController.getOne
);

router.patch(
  '/:id',
  requireRoles('admin', 'therapist'),
  validate([param('id').isUUID()]),
  resourcesController.update
);

router.patch(
  '/:id/upload',
  requireRoles('admin', 'therapist'),
  (req, res, next) => {
    resourceFileUpload.single('file')(req, res, (err: unknown) => {
      if (err) {
        const multerErr = err as { code?: string };
        if (multerErr.code === 'LIMIT_FILE_SIZE') {
          res.status(413).json({ error: 'File is too large. Maximum upload size is 4 MB.' });
          return;
        }
        res.status(400).json({ error: (err as Error).message || 'Upload failed' });
        return;
      }
      next();
    });
  },
  validate([param('id').isUUID()]),
  resourcesController.updateWithFile
);

router.delete(
  '/:id',
  requireRoles('admin'),
  validate([param('id').isUUID()]),
  resourcesController.remove
);

router.post(
  '/:id/assign',
  requireRoles('admin', 'therapist'),
  validate([param('id').isUUID(), body('childId').isUUID(), body('notes').optional().isString()]),
  resourcesController.assign
);

router.delete(
  '/assignments/:assignmentId',
  requireRoles('admin', 'therapist'),
  validate([param('assignmentId').isUUID()]),
  resourcesController.unassign
);

export default router;
