import { Router } from 'express';
import { body, param } from 'express-validator';
import { authMiddleware } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as childrenController from './children.controller';

const router = Router();
router.use(authMiddleware);

router.get('/', childrenController.list);
router.get('/therapy-centers', childrenController.listTherapyCenters);
router.get('/therapy-plans', childrenController.listTherapyPlans);

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
    body('diagnosis').optional().isString(),
    body('referredBy').optional().isString(),
    body('childCode').optional().isString(),
    body('gender').optional().isString(),
    body('profilePhoto').optional().isString(),
    body('diagnosisType').optional().isString(),
    body('autismLevel').optional().isString(),
    body('diagnosisDate').optional().isString(),
    body('primaryLanguage').optional().isString(),
    body('communicationType').optional().isString(),
    body('therapyStartDate').optional().isString(),
    body('therapyStatus').optional().isString(),
    body('assignedTherapistId').optional().isUUID(),
    body('sessionsPerWeek').optional().isInt({ min: 0, max: 14 }),
    body('communicationScore').optional().isInt({ min: 0, max: 10 }),
    body('socialScore').optional().isInt({ min: 0, max: 10 }),
    body('behavioralScore').optional().isInt({ min: 0, max: 10 }),
    body('cognitiveScore').optional().isInt({ min: 0, max: 10 }),
    body('motorSkillScore').optional().isInt({ min: 0, max: 10 }),
    body('status').optional().isString(),
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
    body('diagnosis').optional().isString(),
    body('referredBy').optional().isString(),
    body('childCode').optional().isString(),
    body('gender').optional().isString(),
    body('profilePhoto').optional().isString(),
    body('diagnosisType').optional().isString(),
    body('autismLevel').optional().isString(),
    body('diagnosisDate').optional().isString(),
    body('primaryLanguage').optional().isString(),
    body('communicationType').optional().isString(),
    body('therapyStartDate').optional().isString(),
    body('therapyStatus').optional().isString(),
    body('assignedTherapistId').optional().isUUID(),
    body('assignedTherapistIds').optional().isArray(),
    body('therapyCenterId').optional().isUUID(),
    body('therapyPlanId').optional().isUUID(),
    body('sessionsPerWeek').optional().isInt({ min: 0, max: 14 }),
    body('communicationScore').optional().isInt({ min: 0, max: 10 }),
    body('socialScore').optional().isInt({ min: 0, max: 10 }),
    body('behavioralScore').optional().isInt({ min: 0, max: 10 }),
    body('cognitiveScore').optional().isInt({ min: 0, max: 10 }),
    body('motorSkillScore').optional().isInt({ min: 0, max: 10 }),
    body('status').optional().isString(),
  ]),
  childrenController.update
);

router.delete(
  '/:id',
  validate([param('id').isUUID()]),
  childrenController.remove
);

export default router;
