import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getParentBilling, type ChildBillingAccount } from '../api/billing';
import { errorMessage } from '../api/client';
import { Card, Spinner, ErrorMessage, EmptyState, PageTitle } from '../components/ui';
import { formatDate, formatMoney } from '../utils/format';

function InvoiceStatus({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800',
    paid: 'bg-green-100 text-green-800',
    overdue: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${colors[status] ?? 'bg-slate-100'}`}>
      {status}
    </span>
  );
}

function ChildBillingCard({ account }: { account: ChildBillingAccount }) {
  const outstanding = account.invoices.filter((i) => i.status === 'pending' || i.status === 'overdue');
  const paid = account.invoices.filter((i) => i.status === 'paid');
  const hasActivity =
    account.activePackages.length > 0 ||
    account.activeSubscriptions.length > 0 ||
    outstanding.length > 0 ||
    paid.length > 0;

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{account.childName}</h2>
          {account.childCode && <p className="text-xs text-slate-500">ID: {account.childCode}</p>}
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Outstanding</p>
          <p className={`text-xl font-bold ${account.outstandingCents > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {formatMoney(account.outstandingCents, account.currency)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Paid to date: {formatMoney(account.paidCents, account.currency)}
          </p>
        </div>
      </div>

      {account.activePackages.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-slate-700">Active packages</h3>
          <div className="mt-2 space-y-2">
            {account.activePackages.map((p) => (
              <div key={p.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <p className="font-semibold">{p.packageName}</p>
                <p className="text-slate-600">
                  {p.sessionsRemaining} of {p.sessionsTotal} sessions remaining
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {account.activeSubscriptions.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-slate-700">Subscriptions</h3>
          <div className="mt-2 space-y-2">
            {account.activeSubscriptions.map((s) => (
              <div key={s.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <p className="font-semibold">{s.planName}</p>
                <p className="text-slate-600">
                  {formatMoney(s.amountCents, account.currency)}
                  {s.nextBillingDate ? ` · Next billing ${formatDate(s.nextBillingDate)}` : ''}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {outstanding.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-slate-700">Outstanding invoices</h3>
          <div className="mt-2 space-y-2">
            {outstanding.map((inv) => (
              <Link
                key={inv.id}
                to={`/billing/invoices/${inv.id}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm transition hover:border-amber-300 hover:bg-amber-100"
              >
                <div>
                  <p className="font-semibold">{inv.title}</p>
                  <p className="text-xs text-slate-500">{inv.invoiceNumber}{inv.dueDate ? ` · Due ${formatDate(inv.dueDate)}` : ''}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{formatMoney(inv.amountCents, inv.currency)}</span>
                  <InvoiceStatus status={inv.status} />
                  <span className="text-primary">→</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {paid.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-slate-700">Payment history</h3>
          <div className="mt-2 space-y-1">
            {paid.slice(0, 10).map((inv) => (
              <Link
                key={inv.id}
                to={`/billing/invoices/${inv.id}`}
                className="flex justify-between gap-2 border-b border-slate-100 py-2 text-sm transition hover:bg-slate-50"
              >
                <span className="font-medium text-primary">{inv.title}</span>
                <span className="shrink-0 text-slate-600">
                  {formatMoney(inv.amountCents, inv.currency)}
                  {inv.paidAt ? ` · ${formatDate(inv.paidAt)}` : ''}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {!hasActivity && (
        <p className="text-sm text-slate-500">No billing activity for this child yet.</p>
      )}

      <Link
        to={`/children/${account.childId}`}
        className="inline-block text-sm font-semibold text-primary hover:underline"
      >
        View child profile →
      </Link>
    </Card>
  );
}

export default function ParentBillingPage() {
  const [accounts, setAccounts] = useState<ChildBillingAccount[]>([]);
  const [totals, setTotals] = useState({ outstanding: 0, paid: 0 });
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getParentBilling()
      .then((data) => {
        setAccounts(data.accounts);
        setTotals({ outstanding: data.totalOutstandingCents, paid: data.totalPaidCents });
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setInitialLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <PageTitle>Billing & Payments</PageTitle>
      <p className="text-sm text-slate-600">View outstanding balances, packages, subscriptions, and payment history for your children.</p>

      {error && <ErrorMessage error={error} onRetry={() => window.location.reload()} />}

      {initialLoading ? (
        <Spinner />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Card className={totals.outstanding > 0 ? 'border-red-200 bg-red-50' : 'bg-green-50'}>
              <p className="text-xs font-semibold uppercase text-slate-500">Total outstanding</p>
              <p className={`text-2xl font-bold ${totals.outstanding > 0 ? 'text-red-700' : 'text-green-700'}`}>
                {formatMoney(totals.outstanding)}
              </p>
            </Card>
            <Card>
              <p className="text-xs font-semibold uppercase text-slate-500">Total paid</p>
              <p className="text-2xl font-bold text-slate-900">{formatMoney(totals.paid)}</p>
            </Card>
          </div>

          {accounts.length === 0 && !error ? (
            <EmptyState>
              <p className="text-4xl">💳</p>
              <p className="mt-3 font-semibold text-slate-700">No billing activity yet</p>
              <p className="mt-1 text-slate-500">
                When your clinic assigns packages or invoices sessions, they will appear here.
              </p>
            </EmptyState>
          ) : (
            accounts.map((a) => <ChildBillingCard key={a.childId} account={a} />)
          )}
        </>
      )}
    </div>
  );
}
