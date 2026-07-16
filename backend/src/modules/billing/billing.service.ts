import { query, queryOne } from '../../config/database';
import * as childrenService from '../children/children.service';

export type PackageRow = {
  id: string;
  name: string;
  description: string | null;
  session_count: number;
  price_cents: number;
  currency: string;
  is_active: boolean;
  created_at: string;
};

export type PlanRow = {
  id: string;
  name: string;
  description: string | null;
  interval_months: number;
  price_cents: number;
  sessions_included: number | null;
  currency: string;
  is_active: boolean;
  created_at: string;
};

export type InvoiceRow = {
  id: string;
  child_id: string;
  invoice_number: string;
  title: string;
  invoice_type: string;
  amount_cents: number;
  currency: string;
  status: string;
  due_date: string | null;
  paid_at: string | null;
  session_id: string | null;
  package_id: string | null;
  plan_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

async function nextInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const rows = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM invoices WHERE EXTRACT(YEAR FROM created_at) = $1`,
    [year]
  );
  const n = parseInt(rows[0]?.count ?? '0', 10) + 1;
  return `INV-${year}-${String(n).padStart(4, '0')}`;
}

// ——— Packages ———

export async function listPackages(activeOnly = false): Promise<PackageRow[]> {
  const sql = activeOnly
    ? 'SELECT * FROM therapy_packages WHERE is_active = true ORDER BY name'
    : 'SELECT * FROM therapy_packages ORDER BY is_active DESC, name';
  return query<PackageRow>(sql);
}

export async function createPackage(data: {
  name: string;
  description?: string;
  sessionCount: number;
  priceCents: number;
  currency?: string;
}): Promise<PackageRow> {
  const rows = await query<PackageRow>(
    `INSERT INTO therapy_packages (name, description, session_count, price_cents, currency)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [data.name.trim(), data.description?.trim() ?? null, data.sessionCount, data.priceCents, data.currency ?? 'AED']
  );
  return rows[0];
}

export async function updatePackage(
  id: string,
  data: Partial<{ name: string; description: string; sessionCount: number; priceCents: number; isActive: boolean }>
): Promise<PackageRow | null> {
  const rows = await query<PackageRow>(
    `UPDATE therapy_packages SET
       name = COALESCE($2, name),
       description = COALESCE($3, description),
       session_count = COALESCE($4, session_count),
       price_cents = COALESCE($5, price_cents),
       is_active = COALESCE($6, is_active),
       updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, data.name?.trim(), data.description?.trim(), data.sessionCount, data.priceCents, data.isActive]
  );
  return rows[0] ?? null;
}

// ——— Subscription plans ———

export async function listPlans(activeOnly = false): Promise<PlanRow[]> {
  const sql = activeOnly
    ? 'SELECT * FROM subscription_plans WHERE is_active = true ORDER BY name'
    : 'SELECT * FROM subscription_plans ORDER BY is_active DESC, name';
  return query<PlanRow>(sql);
}

export async function createPlan(data: {
  name: string;
  description?: string;
  intervalMonths: number;
  priceCents: number;
  sessionsIncluded?: number;
  currency?: string;
}): Promise<PlanRow> {
  const rows = await query<PlanRow>(
    `INSERT INTO subscription_plans (name, description, interval_months, price_cents, sessions_included, currency)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [
      data.name.trim(),
      data.description?.trim() ?? null,
      data.intervalMonths,
      data.priceCents,
      data.sessionsIncluded ?? null,
      data.currency ?? 'AED',
    ]
  );
  return rows[0];
}

export async function updatePlan(
  id: string,
  data: Partial<{
    name: string;
    description: string;
    intervalMonths: number;
    priceCents: number;
    sessionsIncluded: number;
    isActive: boolean;
  }>
): Promise<PlanRow | null> {
  const rows = await query<PlanRow>(
    `UPDATE subscription_plans SET
       name = COALESCE($2, name),
       description = COALESCE($3, description),
       interval_months = COALESCE($4, interval_months),
       price_cents = COALESCE($5, price_cents),
       sessions_included = COALESCE($6, sessions_included),
       is_active = COALESCE($7, is_active),
       updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [
      id,
      data.name?.trim(),
      data.description?.trim(),
      data.intervalMonths,
      data.priceCents,
      data.sessionsIncluded,
      data.isActive,
    ]
  );
  return rows[0] ?? null;
}

// ——— Invoices ———

export async function createInvoice(
  userId: string,
  data: {
    childId: string;
    title: string;
    invoiceType: string;
    amountCents: number;
    currency?: string;
    dueDate?: string;
    sessionId?: string;
    packageId?: string;
    planId?: string;
    notes?: string;
  }
): Promise<InvoiceRow> {
  const num = await nextInvoiceNumber();
  const rows = await query<InvoiceRow>(
    `INSERT INTO invoices
       (child_id, invoice_number, title, invoice_type, amount_cents, currency, status, due_date, session_id, package_id, plan_id, notes, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      data.childId,
      num,
      data.title.trim(),
      data.invoiceType,
      data.amountCents,
      data.currency ?? 'AED',
      data.dueDate ?? null,
      data.sessionId ?? null,
      data.packageId ?? null,
      data.planId ?? null,
      data.notes?.trim() ?? null,
      userId,
    ]
  );
  return rows[0];
}

export async function markInvoicePaid(id: string, paymentMethod?: string, reference?: string): Promise<InvoiceRow | null> {
  const inv = await queryOne<InvoiceRow>('SELECT * FROM invoices WHERE id = $1', [id]);
  if (!inv || inv.status === 'paid') return null;

  const rows = await query<InvoiceRow>(
    `UPDATE invoices SET status = 'paid', paid_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id]
  );
  const updated = rows[0];
  if (updated) {
    await query(
      `INSERT INTO invoice_payments (invoice_id, amount_cents, payment_method, reference) VALUES ($1, $2, $3, $4)`,
      [id, inv.amount_cents, paymentMethod ?? 'manual', reference ?? null]
    );
  }
  return updated ?? null;
}

export type InvoiceListRow = InvoiceRow & {
  child_first_name: string;
  child_last_name: string;
};

export type InvoiceDetailRow = InvoiceRow & {
  child_first_name: string;
  child_last_name: string;
  child_code: string | null;
  package_name: string | null;
  plan_name: string | null;
  session_date: string | null;
  session_duration_minutes: number | null;
};

export type InvoicePaymentRow = {
  id: string;
  amount_cents: number;
  payment_method: string | null;
  reference: string | null;
  paid_at: string;
};

export async function listInvoices(filters: {
  childId?: string;
  status?: string;
  limit?: number;
}): Promise<InvoiceListRow[]> {
  const params: unknown[] = [];
  const where: string[] = [];
  if (filters.childId) {
    params.push(filters.childId);
    where.push(`i.child_id = $${params.length}`);
  }
  if (filters.status) {
    params.push(filters.status);
    where.push(`i.status = $${params.length}`);
  }
  const limit = Math.min(filters.limit ?? 100, 200);
  params.push(limit);
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  return query<InvoiceListRow>(
    `SELECT i.*, c.first_name AS child_first_name, c.last_name AS child_last_name
     FROM invoices i
     JOIN children c ON c.id = i.child_id
     ${whereSql}
     ORDER BY i.created_at DESC
     LIMIT $${params.length}`,
    params
  );
}

export async function getInvoiceById(id: string): Promise<InvoiceDetailRow | null> {
  return queryOne<InvoiceDetailRow>(
    `SELECT i.*,
            c.first_name AS child_first_name,
            c.last_name AS child_last_name,
            c.child_code,
            tp.name AS package_name,
            sp.name AS plan_name,
            s.session_date,
            s.duration_minutes AS session_duration_minutes
     FROM invoices i
     JOIN children c ON c.id = i.child_id
     LEFT JOIN therapy_packages tp ON tp.id = i.package_id
     LEFT JOIN subscription_plans sp ON sp.id = i.plan_id
     LEFT JOIN sessions s ON s.id = i.session_id
     WHERE i.id = $1`,
    [id]
  );
}

export async function listInvoicePayments(invoiceId: string): Promise<InvoicePaymentRow[]> {
  return query<InvoicePaymentRow>(
    `SELECT id, amount_cents, payment_method, reference, paid_at
     FROM invoice_payments
     WHERE invoice_id = $1
     ORDER BY paid_at DESC`,
    [invoiceId]
  );
}

export async function billSession(
  userId: string,
  data: { childId: string; sessionId: string; amountCents?: number; dueDate?: string }
): Promise<InvoiceRow | null> {
  const session = await queryOne<{ id: string; child_id: string; session_date: string; duration_minutes: number | null }>(
    'SELECT id, child_id, session_date, duration_minutes FROM sessions WHERE id = $1',
    [data.sessionId]
  );
  if (!session || session.child_id !== data.childId) return null;

  const existing = await queryOne('SELECT id FROM invoices WHERE session_id = $1', [data.sessionId]);
  if (existing) throw new Error('This session has already been billed');

  const amount = data.amountCents ?? 15000; // default 150.00 AED
  const title = `Therapy session — ${session.session_date}${session.duration_minutes ? ` (${session.duration_minutes} min)` : ''}`;

  return createInvoice(userId, {
    childId: data.childId,
    title,
    invoiceType: 'session',
    amountCents: amount,
    sessionId: data.sessionId,
    dueDate: data.dueDate,
  });
}

// ——— Child package / subscription ———

export async function assignPackageToChild(
  userId: string,
  childId: string,
  packageId: string,
  generateInvoice = true
): Promise<{ childPackage: Record<string, unknown>; invoice?: InvoiceRow } | null> {
  const pkg = await queryOne<PackageRow>('SELECT * FROM therapy_packages WHERE id = $1 AND is_active = true', [packageId]);
  if (!pkg) return null;

  const rows = await query(
    `INSERT INTO child_packages (child_id, package_id, sessions_total, sessions_remaining, amount_cents, currency, status, assigned_by)
     VALUES ($1, $2, $3, $3, $4, $5, 'active', $6) RETURNING *`,
    [childId, packageId, pkg.session_count, pkg.price_cents, pkg.currency, userId]
  );
  const childPackage = rows[0] as Record<string, unknown>;

  let invoice: InvoiceRow | undefined;
  if (generateInvoice) {
    invoice = await createInvoice(userId, {
      childId,
      title: `Package: ${pkg.name}`,
      invoiceType: 'package',
      amountCents: pkg.price_cents,
      currency: pkg.currency,
      packageId,
    });
  }
  return { childPackage, invoice };
}

export async function assignSubscriptionToChild(
  userId: string,
  childId: string,
  planId: string
): Promise<{ subscription: Record<string, unknown>; invoice: InvoiceRow } | null> {
  const plan = await queryOne<PlanRow>('SELECT * FROM subscription_plans WHERE id = $1 AND is_active = true', [planId]);
  if (!plan) return null;

  const nextBilling = new Date();
  nextBilling.setMonth(nextBilling.getMonth() + plan.interval_months);

  const rows = await query(
    `INSERT INTO child_subscriptions (child_id, plan_id, amount_cents, currency, status, next_billing_date, assigned_by)
     VALUES ($1, $2, $3, $4, 'active', $5, $6) RETURNING *`,
    [childId, planId, plan.price_cents, plan.currency, nextBilling.toISOString().slice(0, 10), userId]
  );

  const invoice = await createInvoice(userId, {
    childId,
    title: `Subscription: ${plan.name}`,
    invoiceType: 'subscription',
    amountCents: plan.price_cents,
    currency: plan.currency,
    planId,
    dueDate: nextBilling.toISOString().slice(0, 10),
  });

  return { subscription: rows[0] as Record<string, unknown>, invoice };
}

// ——— Account summaries ———

export type ChildBillingAccount = {
  childId: string;
  childName: string;
  childCode: string | null;
  outstandingCents: number;
  paidCents: number;
  currency: string;
  activePackages: Array<{
    id: string;
    packageName: string;
    sessionsRemaining: number;
    sessionsTotal: number;
    status: string;
  }>;
  activeSubscriptions: Array<{
    id: string;
    planName: string;
    nextBillingDate: string | null;
    status: string;
    amountCents: number;
  }>;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    title: string;
    amountCents: number;
    status: string;
    dueDate: string | null;
    paidAt: string | null;
    invoiceType: string;
    createdAt: string;
  }>;
};

async function buildChildAccount(childId: string): Promise<ChildBillingAccount | null> {
  const child = await childrenService.findById(childId);
  if (!child) return null;

  const invoices = await query<InvoiceRow>(
    'SELECT * FROM invoices WHERE child_id = $1 ORDER BY created_at DESC LIMIT 50',
    [childId]
  );

  const outstandingCents = invoices
    .filter((i) => i.status === 'pending' || i.status === 'overdue')
    .reduce((s, i) => s + i.amount_cents, 0);
  const paidCents = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.amount_cents, 0);
  const currency = invoices[0]?.currency ?? 'AED';

  const packages = await query<{
    id: string;
    sessions_remaining: number;
    sessions_total: number;
    status: string;
    package_name: string;
  }>(
    `SELECT cp.id, cp.sessions_remaining, cp.sessions_total, cp.status, p.name AS package_name
     FROM child_packages cp
     JOIN therapy_packages p ON p.id = cp.package_id
     WHERE cp.child_id = $1 AND cp.status = 'active'
     ORDER BY cp.purchased_at DESC`,
    [childId]
  );

  const subs = await query<{
    id: string;
    next_billing_date: string | null;
    status: string;
    amount_cents: number;
    plan_name: string;
  }>(
    `SELECT cs.id, cs.next_billing_date, cs.status, cs.amount_cents, sp.name AS plan_name
     FROM child_subscriptions cs
     JOIN subscription_plans sp ON sp.id = cs.plan_id
     WHERE cs.child_id = $1 AND cs.status = 'active'
     ORDER BY cs.started_at DESC`,
    [childId]
  );

  return {
    childId,
    childName: [child.first_name, child.last_name].filter(Boolean).join(' '),
    childCode: child.child_code ?? null,
    outstandingCents,
    paidCents,
    currency,
    activePackages: packages.map((p) => ({
      id: p.id,
      packageName: p.package_name,
      sessionsRemaining: p.sessions_remaining,
      sessionsTotal: p.sessions_total,
      status: p.status,
    })),
    activeSubscriptions: subs.map((s) => ({
      id: s.id,
      planName: s.plan_name,
      nextBillingDate: s.next_billing_date,
      status: s.status,
      amountCents: s.amount_cents,
    })),
    invoices: invoices.map((i) => ({
      id: i.id,
      invoiceNumber: i.invoice_number,
      title: i.title,
      amountCents: i.amount_cents,
      status: i.status,
      dueDate: i.due_date,
      paidAt: i.paid_at,
      invoiceType: i.invoice_type,
      createdAt: i.created_at,
    })),
  };
}

export async function getChildBillingAccount(
  childId: string,
  userId: string,
  role: string
): Promise<ChildBillingAccount | null> {
  const child = await childrenService.findById(childId);
  if (!child) return null;
  if (!childrenService.canAccessChild(child.user_id, userId, role)) return null;
  return buildChildAccount(childId);
}

export async function getParentBillingSummary(userId: string): Promise<ChildBillingAccount[]> {
  const children = await query<{ id: string }>('SELECT id FROM children WHERE user_id = $1', [userId]);
  const accounts: ChildBillingAccount[] = [];
  for (const c of children) {
    const acc = await buildChildAccount(c.id);
    if (acc) accounts.push(acc);
  }
  return accounts;
}

export async function getOutstandingOverview(): Promise<
  Array<{
    childId: string;
    childName: string;
    outstandingCents: number;
    currency: string;
    invoiceCount: number;
  }>
> {
  const rows = await query<{
    child_id: string;
    first_name: string;
    last_name: string;
    outstanding: string;
    currency: string;
    invoice_count: string;
  }>(
    `SELECT c.id AS child_id, c.first_name, c.last_name,
            COALESCE(SUM(i.amount_cents), 0)::text AS outstanding,
            COALESCE(MAX(i.currency), 'AED') AS currency,
            COUNT(i.id)::text AS invoice_count
     FROM children c
     LEFT JOIN invoices i ON i.child_id = c.id AND i.status IN ('pending', 'overdue')
     GROUP BY c.id, c.first_name, c.last_name
     HAVING COALESCE(SUM(i.amount_cents), 0) > 0
     ORDER BY outstanding DESC`
  );
  return rows.map((r) => ({
    childId: r.child_id,
    childName: `${r.first_name} ${r.last_name}`.trim(),
    outstandingCents: parseInt(r.outstanding, 10),
    currency: r.currency,
    invoiceCount: parseInt(r.invoice_count, 10),
  }));
}

export async function listUnbilledSessions(childId?: string): Promise<
  Array<{
    id: string;
    child_id: string;
    child_name: string;
    session_date: string;
    duration_minutes: number | null;
  }>
> {
  const params: unknown[] = [];
  let extra = '';
  if (childId) {
    params.push(childId);
    extra = ` AND s.child_id = $${params.length}`;
  }
  return query(
    `SELECT s.id, s.child_id, c.first_name || ' ' || c.last_name AS child_name, s.session_date, s.duration_minutes
     FROM sessions s
     JOIN children c ON c.id = s.child_id
     LEFT JOIN invoices i ON i.session_id = s.id
     WHERE i.id IS NULL${extra}
     ORDER BY s.session_date DESC
     LIMIT 50`,
    params
  );
}
