import { Router } from 'express';
import { body, param } from 'express-validator';
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

router.get('/outstanding', billingController.outstanding);
router.get('/unbilled-sessions', billingController.unbilledSessions);

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
router.patch('/packages/:id', validate([param('id').isUUID()]), billingController.updatePackage);

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
router.patch('/plans/:id', validate([param('id').isUUID()]), billingController.updatePlan);

router.get('/invoices', billingController.listInvoices);
router.post(
  '/invoices',
  validate([body('childId').isUUID(), body('title').trim().notEmpty(), body('amountCents').isInt({ min: 0 })]),
  billingController.createInvoice
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
  validate([param('childId').isUUID(), body('planId').isUUID()]),
  billingController.assignSubscription
);

export default router;
