import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authMiddleware } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/roles';
import { validate } from '../../middleware/validate';
import * as billingController from './billing.controller';

const router = Router();
router.use(authMiddleware);

router.get('/my-account', billingController.myAccount);

router.get(
  '/child/:childId',
  validate([param('childId').isUUID()]),
  billingController.childAccount
);

router.get(
  '/invoices/:id',
  validate([param('id').isUUID()]),
  billingController.getInvoice
);

router.use(requireAdmin);

router.get(
  '/outstanding',
  validate([
    query('from').optional().isISO8601(),
    query('to').optional().isISO8601(),
    query('childId').optional().isUUID(),
  ]),
  billingController.outstanding
);
router.get(
  '/sessions',
  validate([query('childId').optional().isUUID()]),
  billingController.sessionsBillingStatus
);

router.get('/packages', billingController.listPackages);
router.post(
  '/packages',
  validate([
    body('name').trim().notEmpty(),
    body('sessionCount').isInt({ min: 1 }),
    body('priceCents').isInt({ min: 0 }),
  ]),
  billingController.createPackage
);
router.patch(
  '/packages/:id',
  validate([
    param('id').isUUID(),
    body('name').optional().trim().notEmpty(),
    body('sessionCount').optional().isInt({ min: 1 }),
    body('priceCents').optional().isInt({ min: 0 }),
    body('isActive').optional().isBoolean(),
  ]),
  billingController.updatePackage
);
router.delete('/packages/:id', validate([param('id').isUUID()]), billingController.deletePackage);

router.get(
  '/child-packages',
  validate([query('childId').optional().isUUID()]),
  billingController.listChildPackages
);
router.patch(
  '/child-packages/:id',
  validate([
    param('id').isUUID(),
    body('sessionsTotal').optional().isInt({ min: 1 }),
    body('sessionsRemaining').optional().isInt({ min: 0 }),
    body('amountCents').optional().isInt({ min: 0 }),
    body('status').optional().isIn(['active', 'expired', 'cancelled']),
    body('expiresAt').optional({ nullable: true }).isISO8601(),
  ]),
  billingController.updateChildPackage
);
router.delete('/child-packages/:id', validate([param('id').isUUID()]), billingController.deleteChildPackage);

router.get('/plans', billingController.listPlans);
router.post(
  '/plans',
  validate([
    body('name').trim().notEmpty(),
    body('intervalMonths').isInt({ min: 1 }),
    body('priceCents').isInt({ min: 0 }),
  ]),
  billingController.createPlan
);
router.patch(
  '/plans/:id',
  validate([
    param('id').isUUID(),
    body('name').optional().trim().notEmpty(),
    body('intervalMonths').optional().isInt({ min: 1 }),
    body('priceCents').optional().isInt({ min: 0 }),
    body('sessionsIncluded').optional().isInt({ min: 0 }),
    body('isActive').optional().isBoolean(),
  ]),
  billingController.updatePlan
);
router.delete('/plans/:id', validate([param('id').isUUID()]), billingController.deletePlan);

router.get(
  '/child-subscriptions',
  validate([query('childId').optional().isUUID()]),
  billingController.listChildSubscriptions
);
router.patch(
  '/child-subscriptions/:id',
  validate([
    param('id').isUUID(),
    body('amountCents').optional().isInt({ min: 0 }),
    body('status').optional().isIn(['active', 'paused', 'cancelled']),
    body('nextBillingDate').optional({ nullable: true }).isISO8601(),
  ]),
  billingController.updateChildSubscription
);
router.delete('/child-subscriptions/:id', validate([param('id').isUUID()]), billingController.deleteChildSubscription);

router.get('/invoices', billingController.listInvoices);
router.post(
  '/invoices',
  validate([body('childId').isUUID(), body('title').trim().notEmpty(), body('amountCents').isInt({ min: 0 })]),
  billingController.createInvoice
);
router.patch(
  '/invoices/:id',
  validate([
    param('id').isUUID(),
    body('title').optional().trim().notEmpty(),
    body('amountCents').optional().isInt({ min: 0 }),
    body('dueDate').optional({ nullable: true }).isISO8601(),
    body('notes').optional({ nullable: true }).isString(),
  ]),
  billingController.updateInvoice
);
router.post('/invoices/:id/pay', validate([param('id').isUUID()]), billingController.payInvoice);

router.post(
  '/session-bill',
  validate([body('childId').isUUID(), body('sessionId').isUUID()]),
  billingController.billSession
);

router.post(
  '/child/:childId/package',
  validate([param('childId').isUUID(), body('packageId').isUUID()]),
  billingController.assignPackage
);

router.post(
  '/child/:childId/subscription',
  validate([
    param('childId').isUUID(),
    body('planId').isUUID(),
    body('effectiveFrom').optional({ nullable: true }).isISO8601(),
  ]),
  billingController.assignSubscription
);

export default router;
