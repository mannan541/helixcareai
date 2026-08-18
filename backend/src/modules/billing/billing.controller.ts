import { Request, Response } from 'express';
import * as billingService from './billing.service';
import * as childrenService from '../children/children.service';

function pkgDto(p: billingService.PackageRow) {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    sessionCount: p.session_count,
    priceCents: p.price_cents,
    currency: p.currency,
    isActive: p.is_active,
    createdAt: p.created_at,
  };
}

function planDto(p: billingService.PlanRow) {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    intervalMonths: p.interval_months,
    priceCents: p.price_cents,
    sessionsIncluded: p.sessions_included,
    currency: p.currency,
    isActive: p.is_active,
    createdAt: p.created_at,
  };
}

function invDto(i: billingService.InvoiceRow) {
  return {
    id: i.id,
    childId: i.child_id,
    invoiceNumber: i.invoice_number,
    title: i.title,
    invoiceType: i.invoice_type,
    amountCents: i.amount_cents,
    currency: i.currency,
    status: i.status,
    dueDate: i.due_date,
    paidAt: i.paid_at,
    sessionId: i.session_id,
    packageId: i.package_id,
    planId: i.plan_id,
    notes: i.notes,
    createdAt: i.created_at,
  };
}

function childPackageDto(cp: billingService.ChildPackageRow | billingService.ChildPackageListRow) {
  const withChild = cp as Partial<billingService.ChildPackageListRow>;
  return {
    id: cp.id,
    childId: cp.child_id,
    childName:
      withChild.child_first_name != null
        ? [withChild.child_first_name, withChild.child_last_name].filter(Boolean).join(' ')
        : undefined,
    packageId: cp.package_id,
    packageName: withChild.package_name,
    sessionsTotal: cp.sessions_total,
    sessionsRemaining: cp.sessions_remaining,
    amountCents: cp.amount_cents,
    currency: cp.currency,
    status: cp.status,
    purchasedAt: cp.purchased_at,
    expiresAt: cp.expires_at,
  };
}

function childSubscriptionDto(cs: billingService.ChildSubscriptionRow | billingService.ChildSubscriptionListRow) {
  const withChild = cs as Partial<billingService.ChildSubscriptionListRow>;
  return {
    id: cs.id,
    childId: cs.child_id,
    childName:
      withChild.child_first_name != null
        ? [withChild.child_first_name, withChild.child_last_name].filter(Boolean).join(' ')
        : undefined,
    planId: cs.plan_id,
    planName: withChild.plan_name,
    amountCents: cs.amount_cents,
    currency: cs.currency,
    status: cs.status,
    startedAt: cs.started_at,
    nextBillingDate: cs.next_billing_date,
  };
}

function invListDto(i: billingService.InvoiceListRow) {
  return {
    ...invDto(i),
    childName: [i.child_first_name, i.child_last_name].filter(Boolean).join(' '),
  };
}

function invDetailDto(i: billingService.InvoiceDetailRow) {
  return {
    ...invDto(i),
    childName: [i.child_first_name, i.child_last_name].filter(Boolean).join(' '),
    childCode: i.child_code,
    packageName: i.package_name,
    planName: i.plan_name,
    sessionDate: i.session_date,
    sessionDurationMinutes: i.session_duration_minutes,
  };
}

export async function listPackages(req: Request, res: Response): Promise<void> {
  const rows = await billingService.listPackages(req.query.activeOnly === 'true');
  res.json({ packages: rows.map(pkgDto) });
}

export async function createPackage(req: Request, res: Response): Promise<void> {
  const { name, description, sessionCount, priceCents, currency } = req.body;
  const row = await billingService.createPackage({ name, description, sessionCount, priceCents, currency });
  res.status(201).json({ package: pkgDto(row) });
}

export async function updatePackage(req: Request, res: Response): Promise<void> {
  const row = await billingService.updatePackage(req.params.id, req.body);
  if (!row) {
    res.status(404).json({ error: 'Package not found' });
    return;
  }
  res.json({ package: pkgDto(row) });
}

export async function deletePackage(req: Request, res: Response): Promise<void> {
  const result = await billingService.deletePackage(req.params.id);
  if (result.inUse) {
    res.status(409).json({ error: 'This package is assigned to one or more children and cannot be deleted. Deactivate it instead.' });
    return;
  }
  if (!result.ok) {
    res.status(404).json({ error: 'Package not found' });
    return;
  }
  res.status(204).send();
}

export async function listPlans(req: Request, res: Response): Promise<void> {
  const rows = await billingService.listPlans(req.query.activeOnly === 'true');
  res.json({ plans: rows.map(planDto) });
}

export async function createPlan(req: Request, res: Response): Promise<void> {
  const { name, description, intervalMonths, priceCents, sessionsIncluded, currency } = req.body;
  const row = await billingService.createPlan({
    name,
    description,
    intervalMonths,
    priceCents,
    sessionsIncluded,
    currency,
  });
  res.status(201).json({ plan: planDto(row) });
}

export async function updatePlan(req: Request, res: Response): Promise<void> {
  const row = await billingService.updatePlan(req.params.id, req.body);
  if (!row) {
    res.status(404).json({ error: 'Plan not found' });
    return;
  }
  res.json({ plan: planDto(row) });
}

export async function deletePlan(req: Request, res: Response): Promise<void> {
  const result = await billingService.deletePlan(req.params.id);
  if (result.inUse) {
    res.status(409).json({ error: 'This plan is assigned to one or more children and cannot be deleted. Deactivate it instead.' });
    return;
  }
  if (!result.ok) {
    res.status(404).json({ error: 'Plan not found' });
    return;
  }
  res.status(204).send();
}

export async function listChildPackages(_req: Request, res: Response): Promise<void> {
  const rows = await billingService.listChildPackages();
  res.json({ childPackages: rows.map(childPackageDto) });
}

export async function updateChildPackage(req: Request, res: Response): Promise<void> {
  const row = await billingService.updateChildPackage(req.params.id, req.body);
  if (!row) {
    res.status(404).json({ error: 'Package assignment not found' });
    return;
  }
  res.json({ childPackage: childPackageDto(row) });
}

export async function deleteChildPackage(req: Request, res: Response): Promise<void> {
  const ok = await billingService.deleteChildPackage(req.params.id);
  if (!ok) {
    res.status(404).json({ error: 'Package assignment not found' });
    return;
  }
  res.status(204).send();
}

export async function listChildSubscriptions(_req: Request, res: Response): Promise<void> {
  const rows = await billingService.listChildSubscriptions();
  res.json({ childSubscriptions: rows.map(childSubscriptionDto) });
}

export async function updateChildSubscription(req: Request, res: Response): Promise<void> {
  const row = await billingService.updateChildSubscription(req.params.id, req.body);
  if (!row) {
    res.status(404).json({ error: 'Subscription assignment not found' });
    return;
  }
  res.json({ childSubscription: childSubscriptionDto(row) });
}

export async function deleteChildSubscription(req: Request, res: Response): Promise<void> {
  const ok = await billingService.deleteChildSubscription(req.params.id);
  if (!ok) {
    res.status(404).json({ error: 'Subscription assignment not found' });
    return;
  }
  res.status(204).send();
}

export async function listInvoices(req: Request, res: Response): Promise<void> {
  const childId = req.query.childId as string | undefined;
  const status = req.query.status as string | undefined;

  if (req.user!.role === 'parent') {
    res.status(403).json({ error: 'Use /api/billing/my-account for parent billing view' });
    return;
  }

  const rows = await billingService.listInvoices({ childId, status });
  res.json({ invoices: rows.map(invListDto) });
}

export async function getInvoice(req: Request, res: Response): Promise<void> {
  const row = await billingService.getInvoiceById(req.params.id);
  if (!row) {
    res.status(404).json({ error: 'Invoice not found' });
    return;
  }

  const child = await childrenService.findById(row.child_id);
  if (!child) {
    res.status(404).json({ error: 'Child not found' });
    return;
  }

  if (!childrenService.canAccessChild(child.user_id, req.user!.userId, req.user!.role)) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const payments = await billingService.listInvoicePayments(row.id);
  res.json({
    invoice: invDetailDto(row),
    payments: payments.map((p) => ({
      id: p.id,
      amountCents: p.amount_cents,
      paymentMethod: p.payment_method,
      reference: p.reference,
      paidAt: p.paid_at,
    })),
  });
}

export async function createInvoice(req: Request, res: Response): Promise<void> {
  const { childId, title, invoiceType, amountCents, currency, dueDate, notes } = req.body;
  const child = await childrenService.findById(childId);
  if (!child) {
    res.status(404).json({ error: 'Child not found' });
    return;
  }
  const row = await billingService.createInvoice(req.user!.userId, {
    childId,
    title,
    invoiceType: invoiceType ?? 'manual',
    amountCents,
    currency,
    dueDate,
    notes,
  });
  res.status(201).json({ invoice: invDto(row) });
}

export async function payInvoice(req: Request, res: Response): Promise<void> {
  const { paymentMethod, reference } = req.body;
  const row = await billingService.markInvoicePaid(req.params.id, paymentMethod, reference);
  if (!row) {
    res.status(404).json({ error: 'Invoice not found or already paid' });
    return;
  }
  res.json({ invoice: invDto(row) });
}

export async function billSession(req: Request, res: Response): Promise<void> {
  try {
    const row = await billingService.billSession(req.user!.userId, req.body);
    if (!row) {
      res.status(400).json({ error: 'Invalid session or child' });
      return;
    }
    res.status(201).json({ invoice: invDto(row) });
  } catch (e: unknown) {
    res.status(400).json({ error: (e as Error).message });
  }
}

export async function assignPackage(req: Request, res: Response): Promise<void> {
  const { packageId, createInvoice } = req.body;
  const result = await billingService.assignPackageToChild(
    req.user!.userId,
    req.params.childId,
    packageId,
    createInvoice !== false
  );
  if (!result) {
    res.status(400).json({ error: 'Invalid child or package' });
    return;
  }
  res.status(201).json({
    childPackage: result.childPackage,
    invoice: result.invoice ? invDto(result.invoice) : undefined,
  });
}

export async function assignSubscription(req: Request, res: Response): Promise<void> {
  const { planId } = req.body;
  const result = await billingService.assignSubscriptionToChild(req.user!.userId, req.params.childId, planId);
  if (!result) {
    res.status(400).json({ error: 'Invalid child or plan' });
    return;
  }
  res.status(201).json({
    subscription: result.subscription,
    invoice: invDto(result.invoice),
  });
}

export async function outstanding(req: Request, res: Response): Promise<void> {
  const rows = await billingService.getOutstandingOverview();
  const total = rows.reduce((s, r) => s + r.outstandingCents, 0);
  res.json({ outstanding: rows, totalOutstandingCents: total });
}

export async function myAccount(req: Request, res: Response): Promise<void> {
  if (req.user!.role !== 'parent') {
    res.status(403).json({ error: 'Parent account view only' });
    return;
  }
  const accounts = await billingService.getParentBillingSummary(req.user!.userId);
  const totalOutstanding = accounts.reduce((s, a) => s + a.outstandingCents, 0);
  const totalPaid = accounts.reduce((s, a) => s + a.paidCents, 0);
  res.json({ accounts, totalOutstandingCents: totalOutstanding, totalPaidCents: totalPaid });
}

export async function childAccount(req: Request, res: Response): Promise<void> {
  const account = await billingService.getChildBillingAccount(
    req.params.childId,
    req.user!.userId,
    req.user!.role
  );
  if (!account) {
    res.status(404).json({ error: 'Child not found or access denied' });
    return;
  }
  res.json({ account });
}

export async function unbilledSessions(req: Request, res: Response): Promise<void> {
  const childId = req.query.childId as string | undefined;
  const rows = await billingService.listUnbilledSessions(childId);
  res.json({
    sessions: rows.map((s) => ({
      id: s.id,
      childId: s.child_id,
      childName: s.child_name,
      sessionDate: s.session_date,
      durationMinutes: s.duration_minutes,
    })),
  });
}
