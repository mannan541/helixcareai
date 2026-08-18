import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getOutstanding,
  listPackages,
  createPackage,
  updatePackage,
  deletePackage,
  listChildPackages,
  updateChildPackage,
  deleteChildPackage,
  listPlans,
  createPlan,
  updatePlan,
  deletePlan,
  listChildSubscriptions,
  updateChildSubscription,
  deleteChildSubscription,
  listInvoices,
  payInvoice,
  billSession,
  assignPackage,
  assignSubscription,
  listSessionsBillingStatus,
  type TherapyPackage,
  type SubscriptionPlan,
  type Invoice,
  type ChildPackageAssignment,
  type ChildSubscriptionAssignment,
  type SessionBillingStatus,
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
  btnDanger,
  inputCls,
  StatusBadge,
  ConfirmDialog,
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
  const [sessions, setSessions] = useState<SessionBillingStatus[]>([]);
  const [childPackages, setChildPackages] = useState<ChildPackageAssignment[]>([]);
  const [childSubscriptions, setChildSubscriptions] = useState<ChildSubscriptionAssignment[]>([]);

  const [pkgName, setPkgName] = useState('');
  const [pkgSessions, setPkgSessions] = useState('10');
  const [pkgPrice, setPkgPrice] = useState('1500');
  const [planName, setPlanName] = useState('');
  const [planMonths, setPlanMonths] = useState('1');
  const [planPrice, setPlanPrice] = useState('2000');
  const [assignChildId, setAssignChildId] = useState('');
  const [assignPkgId, setAssignPkgId] = useState('');
  const [assignPlanId, setAssignPlanId] = useState('');
  const [assignPlanEffectiveFrom, setAssignPlanEffectiveFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [outstandingFrom, setOutstandingFrom] = useState('');
  const [outstandingTo, setOutstandingTo] = useState('');
  const [filterChildId, setFilterChildId] = useState('');
  const [billingPromptSessionId, setBillingPromptSessionId] = useState<string | null>(null);
  const [billingPromptAmount, setBillingPromptAmount] = useState('');
  const [busy, setBusy] = useState(false);

  const [editingPkgId, setEditingPkgId] = useState<string | null>(null);
  const [editPkgName, setEditPkgName] = useState('');
  const [editPkgSessions, setEditPkgSessions] = useState('');
  const [editPkgPrice, setEditPkgPrice] = useState('');
  const [editPkgActive, setEditPkgActive] = useState(true);

  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editPlanName, setEditPlanName] = useState('');
  const [editPlanMonths, setEditPlanMonths] = useState('');
  const [editPlanPrice, setEditPlanPrice] = useState('');
  const [editPlanActive, setEditPlanActive] = useState(true);

  const [editingChildPkgId, setEditingChildPkgId] = useState<string | null>(null);
  const [editChildPkgRemaining, setEditChildPkgRemaining] = useState('');
  const [editChildPkgTotal, setEditChildPkgTotal] = useState('');
  const [editChildPkgStatus, setEditChildPkgStatus] = useState('active');

  const [editingChildSubId, setEditingChildSubId] = useState<string | null>(null);
  const [editChildSubStatus, setEditChildSubStatus] = useState('active');
  const [editChildSubAmount, setEditChildSubAmount] = useState('');
  const [editChildSubNextBilling, setEditChildSubNextBilling] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<
    { kind: 'package' | 'plan' | 'childPackage' | 'childSubscription'; id: string; label: string } | null
  >(null);

  const openInvoice = (invoice: Invoice, message: string) => {
    navigate(`/admin/billing/invoices/${invoice.id}`, { state: { successMessage: message } });
  };

  const load = async (opts?: { silent?: boolean; from?: string; to?: string; childId?: string }) => {
    if (opts?.silent) setRefreshing(true);
    else setInitialLoading(true);
    setError('');
    const failures: string[] = [];
    const outFrom = opts?.from !== undefined ? opts.from : outstandingFrom;
    const outTo = opts?.to !== undefined ? opts.to : outstandingTo;
    const childFilter = opts?.childId !== undefined ? opts.childId : filterChildId;

    const [outR, pkgR, planR, invR, sessR, childR, childPkgR, childSubR] = await Promise.allSettled([
      getOutstanding({ from: outFrom || undefined, to: outTo || undefined, childId: childFilter || undefined }),
      listPackages(),
      listPlans(),
      listInvoices({ childId: childFilter || undefined }),
      listSessionsBillingStatus(childFilter || undefined),
      listChildren(),
      listChildPackages(childFilter || undefined),
      listChildSubscriptions(childFilter || undefined),
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
    if (sessR.status === 'fulfilled') setSessions(sessR.value);
    else {
      setSessions([]);
      failures.push(errorMessage(sessR.reason));
    }
    if (childR.status === 'fulfilled') setChildren(childR.value.children);
    else failures.push(errorMessage(childR.reason));
    if (childPkgR.status === 'fulfilled') setChildPackages(childPkgR.value);
    else {
      setChildPackages([]);
      failures.push(errorMessage(childPkgR.reason));
    }
    if (childSubR.status === 'fulfilled') setChildSubscriptions(childSubR.value);
    else {
      setChildSubscriptions([]);
      failures.push(errorMessage(childSubR.reason));
    }

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

  const startEditPkg = (p: TherapyPackage) => {
    setEditingPkgId(p.id);
    setEditPkgName(p.name);
    setEditPkgSessions(String(p.sessionCount));
    setEditPkgPrice((p.priceCents / 100).toFixed(2));
    setEditPkgActive(p.isActive);
  };
  const cancelEditPkg = () => setEditingPkgId(null);
  const saveEditPkg = async (id: string) => {
    setBusy(true);
    setError('');
    try {
      await updatePackage(id, {
        name: editPkgName,
        sessionCount: parseInt(editPkgSessions, 10),
        priceCents: parseMoneyToCents(editPkgPrice),
        isActive: editPkgActive,
      });
      setEditingPkgId(null);
      await load({ silent: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const startEditPlan = (p: SubscriptionPlan) => {
    setEditingPlanId(p.id);
    setEditPlanName(p.name);
    setEditPlanMonths(String(p.intervalMonths));
    setEditPlanPrice((p.priceCents / 100).toFixed(2));
    setEditPlanActive(p.isActive);
  };
  const cancelEditPlan = () => setEditingPlanId(null);
  const saveEditPlan = async (id: string) => {
    setBusy(true);
    setError('');
    try {
      await updatePlan(id, {
        name: editPlanName,
        intervalMonths: parseInt(editPlanMonths, 10),
        priceCents: parseMoneyToCents(editPlanPrice),
        isActive: editPlanActive,
      });
      setEditingPlanId(null);
      await load({ silent: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const startEditChildPkg = (cp: ChildPackageAssignment) => {
    setEditingChildPkgId(cp.id);
    setEditChildPkgRemaining(String(cp.sessionsRemaining));
    setEditChildPkgTotal(String(cp.sessionsTotal));
    setEditChildPkgStatus(cp.status);
  };
  const cancelEditChildPkg = () => setEditingChildPkgId(null);
  const saveEditChildPkg = async (id: string) => {
    setBusy(true);
    setError('');
    try {
      await updateChildPackage(id, {
        sessionsRemaining: parseInt(editChildPkgRemaining, 10),
        sessionsTotal: parseInt(editChildPkgTotal, 10),
        status: editChildPkgStatus,
      });
      setEditingChildPkgId(null);
      await load({ silent: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const startEditChildSub = (cs: ChildSubscriptionAssignment) => {
    setEditingChildSubId(cs.id);
    setEditChildSubStatus(cs.status);
    setEditChildSubAmount((cs.amountCents / 100).toFixed(2));
    setEditChildSubNextBilling(cs.nextBillingDate ?? '');
  };
  const cancelEditChildSub = () => setEditingChildSubId(null);
  const saveEditChildSub = async (id: string) => {
    setBusy(true);
    setError('');
    try {
      await updateChildSubscription(id, {
        status: editChildSubStatus,
        amountCents: parseMoneyToCents(editChildSubAmount),
        nextBillingDate: editChildSubNextBilling || undefined,
      });
      setEditingChildSubId(null);
      await load({ silent: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    setError('');
    try {
      if (deleteTarget.kind === 'package') await deletePackage(deleteTarget.id);
      else if (deleteTarget.kind === 'plan') await deletePlan(deleteTarget.id);
      else if (deleteTarget.kind === 'childPackage') await deleteChildPackage(deleteTarget.id);
      else if (deleteTarget.kind === 'childSubscription') await deleteChildSubscription(deleteTarget.id);
      setDeleteTarget(null);
      await load({ silent: true });
    } catch (err) {
      setError(errorMessage(err));
      setDeleteTarget(null);
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
    sessions.length === 0;

  return (
    <div className="space-y-4">
      <PageTitle>Billing & Invoicing</PageTitle>
      <p className="text-sm text-slate-600">Manage packages, subscriptions, session billing, and outstanding balances.</p>

      {error && <ErrorMessage error={error} onRetry={() => load({ silent: true })} />}

      <div className="flex flex-wrap items-end gap-2">
        <Field label="Filter by child">
          <select
            className={`${inputCls} min-w-[12rem]`}
            value={filterChildId}
            onChange={(e) => {
              setFilterChildId(e.target.value);
              load({ silent: true, childId: e.target.value });
            }}
          >
            <option value="">All children</option>
            {children.map((c) => (
              <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
            ))}
          </select>
        </Field>
        {filterChildId && (
          <button
            type="button"
            className={btnSecondary}
            onClick={() => {
              setFilterChildId('');
              load({ silent: true, childId: '' });
            }}
          >
            Clear
          </button>
        )}
      </div>

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
              <Card>
                <div className="flex flex-wrap items-end gap-2">
                  <Field label="From">
                    <input type="date" className={inputCls} value={outstandingFrom} onChange={(e) => setOutstandingFrom(e.target.value)} />
                  </Field>
                  <Field label="To">
                    <input type="date" className={inputCls} value={outstandingTo} onChange={(e) => setOutstandingTo(e.target.value)} />
                  </Field>
                  <button type="button" className={btnPrimary} disabled={refreshing} onClick={() => load({ silent: true })}>
                    Apply
                  </button>
                  {(outstandingFrom || outstandingTo) && (
                    <button
                      type="button"
                      className={btnSecondary}
                      onClick={() => {
                        setOutstandingFrom('');
                        setOutstandingTo('');
                        load({ silent: true, from: '', to: '' });
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </Card>
              <Card className="bg-primary-light">
                <p className="text-sm text-primary-dark">
                  Total outstanding{outstandingFrom || outstandingTo ? ' (filtered)' : ''}
                </p>
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
                  packages.map((p) =>
                    editingPkgId === p.id ? (
                      <Card key={p.id}>
                        <div className="space-y-2">
                          <Field label="Package name" required>
                            <input className={inputCls} value={editPkgName} onChange={(e) => setEditPkgName(e.target.value)} />
                          </Field>
                          <div className="flex gap-2">
                            <Field label="Sessions" required>
                              <input type="number" min={1} className={inputCls} value={editPkgSessions} onChange={(e) => setEditPkgSessions(e.target.value)} />
                            </Field>
                            <Field label="Price" required>
                              <input className={inputCls} value={editPkgPrice} onChange={(e) => setEditPkgPrice(e.target.value)} />
                            </Field>
                          </div>
                          <label className="flex items-center gap-2 text-sm text-slate-700">
                            <input type="checkbox" checked={editPkgActive} onChange={(e) => setEditPkgActive(e.target.checked)} />
                            Active (assignable to children)
                          </label>
                          <div className="flex gap-2">
                            <button type="button" className={btnPrimary} disabled={busy} onClick={() => saveEditPkg(p.id)}>
                              Save
                            </button>
                            <button type="button" className={btnSecondary} onClick={cancelEditPkg}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      </Card>
                    ) : (
                      <Card key={p.id}>
                        <div className="flex justify-between gap-2">
                          <div>
                            <p className="font-semibold">{p.name}</p>
                            <p className="text-sm text-slate-600">{p.sessionCount} sessions · {formatMoney(p.priceCents, p.currency)}</p>
                          </div>
                          <div className="flex items-start gap-2">
                            {p.isActive ? <StatusBadge status="active" /> : <StatusBadge status="cancelled" />}
                          </div>
                        </div>
                        <div className="mt-2 flex gap-2">
                          <button type="button" className={btnSecondary} onClick={() => startEditPkg(p)}>
                            Edit
                          </button>
                          <button
                            type="button"
                            className={btnDanger}
                            onClick={() => setDeleteTarget({ kind: 'package', id: p.id, label: p.name })}
                          >
                            Delete
                          </button>
                        </div>
                      </Card>
                    )
                  )
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
              <div className="space-y-2 lg:col-span-2">
                <h2 className="font-bold">Assigned packages</h2>
                {childPackages.length === 0 ? (
                  <EmptyState>
                    <p className="font-semibold text-slate-700">No packages assigned yet</p>
                    <p className="mt-1 text-slate-500">Assign a package to a child above to see it here.</p>
                  </EmptyState>
                ) : (
                  childPackages.map((cp) =>
                    editingChildPkgId === cp.id ? (
                      <Card key={cp.id}>
                        <p className="font-semibold">
                          {cp.childName} — {cp.packageName}
                        </p>
                        <div className="mt-2 flex flex-wrap items-end gap-2">
                          <Field label="Sessions remaining">
                            <input type="number" min={0} className={`${inputCls} w-32`} value={editChildPkgRemaining} onChange={(e) => setEditChildPkgRemaining(e.target.value)} />
                          </Field>
                          <Field label="Sessions total">
                            <input type="number" min={1} className={`${inputCls} w-32`} value={editChildPkgTotal} onChange={(e) => setEditChildPkgTotal(e.target.value)} />
                          </Field>
                          <Field label="Status">
                            <select className={inputCls} value={editChildPkgStatus} onChange={(e) => setEditChildPkgStatus(e.target.value)}>
                              <option value="active">Active</option>
                              <option value="expired">Expired</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </Field>
                          <button type="button" className={btnPrimary} disabled={busy} onClick={() => saveEditChildPkg(cp.id)}>
                            Save
                          </button>
                          <button type="button" className={btnSecondary} onClick={cancelEditChildPkg}>
                            Cancel
                          </button>
                        </div>
                      </Card>
                    ) : (
                      <Card key={cp.id} className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold">
                            {cp.childName} — {cp.packageName}
                          </p>
                          <p className="text-sm text-slate-600">
                            {cp.sessionsRemaining} / {cp.sessionsTotal} sessions remaining · {formatMoney(cp.amountCents, cp.currency)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={cp.status} />
                          <button type="button" className={btnSecondary} onClick={() => startEditChildPkg(cp)}>
                            Edit
                          </button>
                          <button
                            type="button"
                            className={btnDanger}
                            onClick={() =>
                              setDeleteTarget({
                                kind: 'childPackage',
                                id: cp.id,
                                label: `${cp.packageName} for ${cp.childName}`,
                              })
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </Card>
                    )
                  )
                )}
              </div>
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
                  plans.map((p) =>
                    editingPlanId === p.id ? (
                      <Card key={p.id}>
                        <div className="space-y-2">
                          <Field label="Plan name" required>
                            <input className={inputCls} value={editPlanName} onChange={(e) => setEditPlanName(e.target.value)} />
                          </Field>
                          <div className="flex gap-2">
                            <Field label="Interval (months)" required>
                              <input type="number" min={1} className={inputCls} value={editPlanMonths} onChange={(e) => setEditPlanMonths(e.target.value)} />
                            </Field>
                            <Field label="Price" required>
                              <input className={inputCls} value={editPlanPrice} onChange={(e) => setEditPlanPrice(e.target.value)} />
                            </Field>
                          </div>
                          <label className="flex items-center gap-2 text-sm text-slate-700">
                            <input type="checkbox" checked={editPlanActive} onChange={(e) => setEditPlanActive(e.target.checked)} />
                            Active (assignable to children)
                          </label>
                          <div className="flex gap-2">
                            <button type="button" className={btnPrimary} disabled={busy} onClick={() => saveEditPlan(p.id)}>
                              Save
                            </button>
                            <button type="button" className={btnSecondary} onClick={cancelEditPlan}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      </Card>
                    ) : (
                      <Card key={p.id}>
                        <div className="flex justify-between gap-2">
                          <div>
                            <p className="font-semibold">{p.name}</p>
                            <p className="text-sm text-slate-600">
                              Every {p.intervalMonths} mo · {formatMoney(p.priceCents, p.currency)}
                            </p>
                          </div>
                          {p.isActive ? <StatusBadge status="active" /> : <StatusBadge status="cancelled" />}
                        </div>
                        <div className="mt-2 flex gap-2">
                          <button type="button" className={btnSecondary} onClick={() => startEditPlan(p)}>
                            Edit
                          </button>
                          <button
                            type="button"
                            className={btnDanger}
                            onClick={() => setDeleteTarget({ kind: 'plan', id: p.id, label: p.name })}
                          >
                            Delete
                          </button>
                        </div>
                      </Card>
                    )
                  )
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
                  <Field label="Effective from">
                    <input
                      type="date"
                      className={inputCls}
                      value={assignPlanEffectiveFrom}
                      onChange={(e) => setAssignPlanEffectiveFrom(e.target.value)}
                    />
                  </Field>
                  <button
                    type="button"
                    className={btnPrimary}
                    disabled={!assignChildId || !assignPlanId || busy}
                    onClick={async () => {
                      setBusy(true);
                      setError('');
                      try {
                        const invoice = await assignSubscription(assignChildId, assignPlanId, assignPlanEffectiveFrom);
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
              <div className="space-y-2 lg:col-span-2">
                <h2 className="font-bold">Assigned subscriptions</h2>
                {childSubscriptions.length === 0 ? (
                  <EmptyState>
                    <p className="font-semibold text-slate-700">No subscriptions assigned yet</p>
                    <p className="mt-1 text-slate-500">Assign a plan to a child above to see it here.</p>
                  </EmptyState>
                ) : (
                  childSubscriptions.map((cs) =>
                    editingChildSubId === cs.id ? (
                      <Card key={cs.id}>
                        <p className="font-semibold">
                          {cs.childName} — {cs.planName}
                        </p>
                        <div className="mt-2 flex flex-wrap items-end gap-2">
                          <Field label="Status">
                            <select className={inputCls} value={editChildSubStatus} onChange={(e) => setEditChildSubStatus(e.target.value)}>
                              <option value="active">Active</option>
                              <option value="paused">Paused</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </Field>
                          <Field label="Amount">
                            <input className={`${inputCls} w-32`} value={editChildSubAmount} onChange={(e) => setEditChildSubAmount(e.target.value)} />
                          </Field>
                          <Field label="Next billing date">
                            <input type="date" className={inputCls} value={editChildSubNextBilling} onChange={(e) => setEditChildSubNextBilling(e.target.value)} />
                          </Field>
                          <button type="button" className={btnPrimary} disabled={busy} onClick={() => saveEditChildSub(cs.id)}>
                            Save
                          </button>
                          <button type="button" className={btnSecondary} onClick={cancelEditChildSub}>
                            Cancel
                          </button>
                        </div>
                      </Card>
                    ) : (
                      <Card key={cs.id} className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold">
                            {cs.childName} — {cs.planName}
                          </p>
                          <p className="text-sm text-slate-600">
                            {formatMoney(cs.amountCents, cs.currency)}
                            {cs.nextBillingDate ? ` · Next billing ${formatDate(cs.nextBillingDate)}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={cs.status} />
                          <button type="button" className={btnSecondary} onClick={() => startEditChildSub(cs)}>
                            Edit
                          </button>
                          <button
                            type="button"
                            className={btnDanger}
                            onClick={() =>
                              setDeleteTarget({
                                kind: 'childSubscription',
                                id: cs.id,
                                label: `${cs.planName} for ${cs.childName}`,
                              })
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </Card>
                    )
                  )
                )}
              </div>
            </div>
          )}

          {tab === 'sessions' && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">Session billing status — create an invoice for unbilled sessions, or mark an existing one as paid.</p>
              {sessions.length === 0 ? (
                <EmptyState>
                  <p className="font-semibold text-slate-700">No sessions yet</p>
                  <p className="mt-1 text-slate-500">Logged sessions will appear here with their billing status.</p>
                </EmptyState>
              ) : (
                sessions.map((s) => (
                  <Card key={s.id} className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{s.childName}</p>
                      <p className="text-sm text-slate-600">
                        {formatDate(s.sessionDate)}
                        {s.durationMinutes ? ` · ${s.durationMinutes} min` : ''}
                        {s.invoiceNumber ? ` · ${s.invoiceNumber}` : ''}
                      </p>
                    </div>
                    {!s.invoiceId ? (
                      billingPromptSessionId === s.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            className={`${inputCls} w-28`}
                            value={billingPromptAmount}
                            onChange={(e) => setBillingPromptAmount(e.target.value)}
                            placeholder="Amount"
                            autoFocus
                          />
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
                                  amountCents: parseMoneyToCents(billingPromptAmount),
                                });
                                setBillingPromptSessionId(null);
                                await load({ silent: true });
                                openInvoice(invoice, `Invoice ${invoice.invoiceNumber} created for session billing.`);
                              } catch (err) {
                                setError(errorMessage(err));
                              } finally {
                                setBusy(false);
                              }
                            }}
                          >
                            Confirm
                          </button>
                          <button type="button" className={btnSecondary} onClick={() => setBillingPromptSessionId(null)}>
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className={btnPrimary}
                          onClick={() => {
                            setBillingPromptSessionId(s.id);
                            setBillingPromptAmount('150');
                          }}
                        >
                          Create invoice
                        </button>
                      )
                    ) : (
                      <div className="flex items-center gap-2">
                        <InvoiceStatus status={s.invoiceStatus ?? 'pending'} />
                        {(s.invoiceStatus === 'pending' || s.invoiceStatus === 'overdue') && (
                          <>
                            <button
                              type="button"
                              className={btnSecondary}
                              disabled={busy}
                              onClick={async () => {
                                setBusy(true);
                                setError('');
                                try {
                                  await payInvoice(s.invoiceId!);
                                  await load({ silent: true });
                                } catch (err) {
                                  setError(errorMessage(err));
                                } finally {
                                  setBusy(false);
                                }
                              }}
                            >
                              Mark as paid
                            </button>
                            <button
                              type="button"
                              className={btnSecondary}
                              onClick={() => navigate(`/admin/billing/invoices/${s.invoiceId}`)}
                            >
                              Edit
                            </button>
                          </>
                        )}
                      </div>
                    )}
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
                      {(inv.status === 'pending' || inv.status === 'overdue') && (
                        <>
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
                          <button
                            type="button"
                            className={btnSecondary}
                            onClick={(e) => {
                              e.preventDefault();
                              navigate(`/admin/billing/invoices/${inv.id}`);
                            }}
                          >
                            Edit
                          </button>
                        </>
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

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete this?"
        message={
          deleteTarget
            ? `This will permanently delete "${deleteTarget.label}". This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
