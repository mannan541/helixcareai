import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getOutstanding,
  listPackages,
  createPackage,
  listPlans,
  createPlan,
  listInvoices,
  payInvoice,
  billSession,
  assignPackage,
  assignSubscription,
  listUnbilledSessions,
  type TherapyPackage,
  type SubscriptionPlan,
  type Invoice,
} from '../api/billing';
import { listChildren } from '../api/children';
import type { Child } from '../api/types';
import { errorMessage } from '../api/client';
import {
  Card,
  Field,
  Spinner,
  ErrorMessage,
  EmptyState,
  PageTitle,
  btnPrimary,
  btnSecondary,
  inputCls,
  StatusBadge,
} from '../components/ui';
import { formatDate, formatMoney, parseMoneyToCents } from '../utils/format';

type Tab = 'outstanding' | 'packages' | 'plans' | 'sessions' | 'invoices';

const EMPTY_OUTSTANDING = { outstanding: [] as Awaited<ReturnType<typeof getOutstanding>>['outstanding'], totalOutstandingCents: 0 };

function InvoiceStatus({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800',
    paid: 'bg-green-100 text-green-800',
    overdue: 'bg-red-100 text-red-800',
    cancelled: 'bg-slate-200 text-slate-600',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${colors[status] ?? 'bg-slate-100'}`}>
      {status}
    </span>
  );
}

export default function AdminBillingPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('outstanding');
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [children, setChildren] = useState<Child[]>([]);

  const [outstanding, setOutstanding] = useState(EMPTY_OUTSTANDING);
  const [packages, setPackages] = useState<TherapyPackage[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [unbilled, setUnbilled] = useState<Awaited<ReturnType<typeof listUnbilledSessions>>>([]);

  const [pkgName, setPkgName] = useState('');
  const [pkgSessions, setPkgSessions] = useState('10');
  const [pkgPrice, setPkgPrice] = useState('1500');
  const [planName, setPlanName] = useState('');
  const [planMonths, setPlanMonths] = useState('1');
  const [planPrice, setPlanPrice] = useState('2000');
  const [assignChildId, setAssignChildId] = useState('');
  const [assignPkgId, setAssignPkgId] = useState('');
  const [assignPlanId, setAssignPlanId] = useState('');
  const [sessionAmount, setSessionAmount] = useState('150');
  const [busy, setBusy] = useState(false);

  const openInvoice = (invoice: Invoice, message: string) => {
    navigate(`/admin/billing/invoices/${invoice.id}`, { state: { successMessage: message } });
  };

  const load = async (opts?: { silent?: boolean }) => {
    if (opts?.silent) setRefreshing(true);
    else setInitialLoading(true);
    setError('');
    const failures: string[] = [];

    const [outR, pkgR, planR, invR, unbR, childR] = await Promise.allSettled([
      getOutstanding(),
      listPackages(),
      listPlans(),
      listInvoices(),
      listUnbilledSessions(),
      listChildren(),
    ]);

    if (outR.status === 'fulfilled') setOutstanding(outR.value);
    else {
      setOutstanding(EMPTY_OUTSTANDING);
      failures.push(errorMessage(outR.reason));
    }
    if (pkgR.status === 'fulfilled') setPackages(pkgR.value);
    else {
      setPackages([]);
      failures.push(errorMessage(pkgR.reason));
    }
    if (planR.status === 'fulfilled') setPlans(planR.value);
    else {
      setPlans([]);
      failures.push(errorMessage(planR.reason));
    }
    if (invR.status === 'fulfilled') setInvoices(invR.value);
    else {
      setInvoices([]);
      failures.push(errorMessage(invR.reason));
    }
    if (unbR.status === 'fulfilled') setUnbilled(unbR.value);
    else {
      setUnbilled([]);
      failures.push(errorMessage(unbR.reason));
    }
    if (childR.status === 'fulfilled') setChildren(childR.value.children);
    else failures.push(errorMessage(childR.reason));

    if (failures.length > 0) {
      const unique = [...new Set(failures)];
      setError(unique.join('\n'));
    }

    setInitialLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    load();
  }, []);

  const addPackage = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await createPackage({
        name: pkgName,
        sessionCount: parseInt(pkgSessions, 10),
        priceCents: parseMoneyToCents(pkgPrice),
      });
      setPkgName('');
      await load({ silent: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const addPlan = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await createPlan({
        name: planName,
        intervalMonths: parseInt(planMonths, 10),
        priceCents: parseMoneyToCents(planPrice),
      });
      setPlanName('');
      await load({ silent: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'outstanding', label: 'Outstanding' },
    { id: 'packages', label: 'Packages' },
    { id: 'plans', label: 'Subscription plans' },
    { id: 'sessions', label: 'Session billing' },
    { id: 'invoices', label: 'All invoices' },
  ];

  const isEmptyBilling =
    outstanding.outstanding.length === 0 &&
    packages.length === 0 &&
    plans.length === 0 &&
    invoices.length === 0 &&
    unbilled.length === 0;

  return (
    <div className="space-y-4">
      <PageTitle>Billing & Invoicing</PageTitle>
      <p className="text-sm text-slate-600">Manage packages, subscriptions, session billing, and outstanding balances.</p>

      {error && <ErrorMessage error={error} onRetry={() => load({ silent: true })} />}

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
              tab === t.id ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t.label}
          </button>
        ))}
        {refreshing && <span className="self-center text-xs text-slate-400">Refreshing…</span>}
      </div>

      {initialLoading ? (
        <Spinner />
      ) : (
        <>
          {isEmptyBilling && !error && (
            <EmptyState>
              <p className="text-4xl">💳</p>
              <p className="mt-3 font-semibold text-slate-700">No billing set up yet</p>
              <p className="mt-1 text-slate-500">
                Create a therapy package or subscription plan, then assign it to a child to generate your first invoice.
              </p>
            </EmptyState>
          )}

          {tab === 'outstanding' && (
            <div className="space-y-4">
              <Card className="bg-primary-light">
                <p className="text-sm text-primary-dark">Total outstanding</p>
                <p className="text-3xl font-bold text-primary-dark">
                  {formatMoney(outstanding.totalOutstandingCents)}
                </p>
              </Card>
              {outstanding.outstanding.length === 0 ? (
                <EmptyState>
                  <p className="font-semibold text-slate-700">No outstanding balances</p>
                  <p className="mt-1 text-slate-500">All invoices are paid, or no invoices have been created yet.</p>
                </EmptyState>
              ) : (
                <div className="space-y-2">
                  {outstanding.outstanding.map((o) => (
                    <Card key={o.childId} className="flex justify-between gap-4">
                      <div>
                        <p className="font-semibold">{o.childName}</p>
                        <p className="text-xs text-slate-500">{o.invoiceCount} unpaid invoice(s)</p>
                      </div>
                      <p className="text-lg font-bold text-red-600">{formatMoney(o.outstandingCents, o.currency)}</p>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'packages' && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <h2 className="mb-3 font-bold">Create package</h2>
                <form onSubmit={addPackage} className="space-y-3">
                  <Field label="Package name" required>
                    <input className={inputCls} value={pkgName} onChange={(e) => setPkgName(e.target.value)} required placeholder="10 Session Bundle" />
                  </Field>
                  <Field label="Sessions included" required>
                    <input type="number" min={1} className={inputCls} value={pkgSessions} onChange={(e) => setPkgSessions(e.target.value)} />
                  </Field>
                  <Field label="Price" required>
                    <input className={inputCls} value={pkgPrice} onChange={(e) => setPkgPrice(e.target.value)} placeholder="1500.00" />
                  </Field>
                  <button type="submit" className={btnPrimary} disabled={busy}>
                    {busy ? 'Saving…' : 'Add package'}
                  </button>
                </form>
              </Card>
              <div className="space-y-2">
                <h2 className="font-bold">Packages</h2>
                {packages.length === 0 ? (
                  <EmptyState>
                    <p className="font-semibold text-slate-700">No packages yet</p>
                    <p className="mt-1 text-slate-500">Create a session bundle (e.g. 10 sessions for 1,500).</p>
                  </EmptyState>
                ) : (
                  packages.map((p) => (
                    <Card key={p.id}>
                      <div className="flex justify-between gap-2">
                        <div>
                          <p className="font-semibold">{p.name}</p>
                          <p className="text-sm text-slate-600">{p.sessionCount} sessions · {formatMoney(p.priceCents, p.currency)}</p>
                        </div>
                        {p.isActive ? <StatusBadge status="active" /> : <StatusBadge status="cancelled" />}
                      </div>
                    </Card>
                  ))
                )}
              </div>
              <Card className="lg:col-span-2">
                <h2 className="mb-3 font-bold">Assign package to child</h2>
                <div className="flex flex-wrap gap-2">
                  <select className={inputCls} value={assignChildId} onChange={(e) => setAssignChildId(e.target.value)}>
                    <option value="">Select child…</option>
                    {children.map((c) => (
                      <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                    ))}
                  </select>
                  <select className={inputCls} value={assignPkgId} onChange={(e) => setAssignPkgId(e.target.value)}>
                    <option value="">Select package…</option>
                    {packages.filter((p) => p.isActive).map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className={btnPrimary}
                    disabled={!assignChildId || !assignPkgId || busy}
                    onClick={async () => {
                      setBusy(true);
                      setError('');
                      try {
                        const invoice = await assignPackage(assignChildId, assignPkgId);
                        await load({ silent: true });
                        openInvoice(invoice, `Invoice ${invoice.invoiceNumber} created for package assignment.`);
                      } catch (err) {
                        setError(errorMessage(err));
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Assign & invoice
                  </button>
                </div>
              </Card>
            </div>
          )}

          {tab === 'plans' && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <h2 className="mb-3 font-bold">Create subscription plan</h2>
                <form onSubmit={addPlan} className="space-y-3">
                  <Field label="Plan name" required>
                    <input className={inputCls} value={planName} onChange={(e) => setPlanName(e.target.value)} required placeholder="Monthly Therapy" />
                  </Field>
                  <Field label="Billing interval (months)" required>
                    <input type="number" min={1} className={inputCls} value={planMonths} onChange={(e) => setPlanMonths(e.target.value)} />
                  </Field>
                  <Field label="Price per period" required>
                    <input className={inputCls} value={planPrice} onChange={(e) => setPlanPrice(e.target.value)} />
                  </Field>
                  <button type="submit" className={btnPrimary} disabled={busy}>
                    {busy ? 'Saving…' : 'Add plan'}
                  </button>
                </form>
              </Card>
              <div className="space-y-2">
                <h2 className="font-bold">Plans</h2>
                {plans.length === 0 ? (
                  <EmptyState>
                    <p className="font-semibold text-slate-700">No subscription plans yet</p>
                    <p className="mt-1 text-slate-500">Create a monthly or term-based plan for recurring billing.</p>
                  </EmptyState>
                ) : (
                  plans.map((p) => (
                    <Card key={p.id}>
                      <p className="font-semibold">{p.name}</p>
                      <p className="text-sm text-slate-600">
                        Every {p.intervalMonths} mo · {formatMoney(p.priceCents, p.currency)}
                      </p>
                    </Card>
                  ))
                )}
              </div>
              <Card className="lg:col-span-2">
                <h2 className="mb-3 font-bold">Assign subscription to child</h2>
                <div className="flex flex-wrap gap-2">
                  <select className={inputCls} value={assignChildId} onChange={(e) => setAssignChildId(e.target.value)}>
                    <option value="">Select child…</option>
                    {children.map((c) => (
                      <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                    ))}
                  </select>
                  <select className={inputCls} value={assignPlanId} onChange={(e) => setAssignPlanId(e.target.value)}>
                    <option value="">Select plan…</option>
                    {plans.filter((p) => p.isActive).map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className={btnPrimary}
                    disabled={!assignChildId || !assignPlanId || busy}
                    onClick={async () => {
                      setBusy(true);
                      setError('');
                      try {
                        const invoice = await assignSubscription(assignChildId, assignPlanId);
                        await load({ silent: true });
                        openInvoice(invoice, `Invoice ${invoice.invoiceNumber} created for subscription assignment.`);
                      } catch (err) {
                        setError(errorMessage(err));
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Assign & invoice
                  </button>
                </div>
              </Card>
            </div>
          )}

          {tab === 'sessions' && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">Bill therapy sessions that have not been invoiced yet.</p>
              <Field label="Default session amount">
                <input className={`${inputCls} max-w-xs`} value={sessionAmount} onChange={(e) => setSessionAmount(e.target.value)} />
              </Field>
              {unbilled.length === 0 ? (
                <EmptyState>
                  <p className="font-semibold text-slate-700">No unbilled sessions</p>
                  <p className="mt-1 text-slate-500">All recent sessions have invoices, or no sessions have been logged yet.</p>
                </EmptyState>
              ) : (
                unbilled.map((s) => (
                  <Card key={s.id} className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{s.childName}</p>
                      <p className="text-sm text-slate-600">
                        {formatDate(s.sessionDate)}
                        {s.durationMinutes ? ` · ${s.durationMinutes} min` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      className={btnPrimary}
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        setError('');
                        try {
                          const invoice = await billSession({
                            childId: s.childId,
                            sessionId: s.id,
                            amountCents: parseMoneyToCents(sessionAmount),
                          });
                          await load({ silent: true });
                          openInvoice(invoice, `Invoice ${invoice.invoiceNumber} created for session billing.`);
                        } catch (err) {
                          setError(errorMessage(err));
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      Create invoice
                    </button>
                  </Card>
                ))
              )}
            </div>
          )}

          {tab === 'invoices' && (
            <div className="space-y-2">
              {invoices.length === 0 ? (
                <EmptyState>
                  <p className="font-semibold text-slate-700">No invoices yet</p>
                  <p className="mt-1 text-slate-500">
                    Invoices are created when you assign a package, subscription, or bill a session.
                  </p>
                </EmptyState>
              ) : (
                invoices.map((inv) => (
                  <Link key={inv.id} to={`/admin/billing/invoices/${inv.id}`} className="block">
                  <Card className="flex flex-wrap items-center justify-between gap-3 transition hover:border-primary hover:shadow-sm">
                    <div>
                      <p className="font-semibold">{inv.invoiceNumber} — {inv.title}</p>
                      <p className="text-xs text-slate-500">
                        {inv.childName ? `${inv.childName} · ` : ''}
                        {formatDate(inv.createdAt)} · {inv.invoiceType}
                        {inv.dueDate ? ` · Due ${formatDate(inv.dueDate)}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-bold">{formatMoney(inv.amountCents, inv.currency)}</p>
                      <InvoiceStatus status={inv.status} />
                      {inv.status === 'pending' && (
                        <button
                          type="button"
                          className={btnSecondary}
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              await payInvoice(inv.id);
                              await load({ silent: true });
                            } catch (err) {
                              setError(errorMessage(err));
                            }
                          }}
                        >
                          Mark paid
                        </button>
                      )}
                      <span className="text-sm font-semibold text-primary">View →</span>
                    </div>
                  </Card>
                  </Link>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
