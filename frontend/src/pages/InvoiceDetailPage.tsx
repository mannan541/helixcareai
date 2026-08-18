import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { getInvoice, payInvoice, updateInvoice, type Invoice, type InvoicePayment } from '../api/billing';
import { errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Card,
  Field,
  Spinner,
  ErrorMessage,
  SuccessMessage,
  PageTitle,
  btnPrimary,
  btnSecondary,
  inputCls,
} from '../components/ui';
import BackButton from '../components/BackButton';
import { formatDate, formatDateTime, formatMoney, parseMoneyToCents, toDateInput } from '../utils/format';

function InvoiceStatus({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800',
    paid: 'bg-green-100 text-green-800',
    overdue: 'bg-red-100 text-red-800',
    cancelled: 'bg-slate-200 text-slate-600',
  };
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${colors[status] ?? 'bg-slate-100'}`}>
      {status}
    </span>
  );
}

function invoiceTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    session: 'Session',
    package: 'Package',
    subscription: 'Subscription',
    manual: 'Manual',
  };
  return labels[type] ?? type;
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap justify-between gap-2 border-b border-slate-100 py-3 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-900">{children}</span>
    </div>
  );
}

export default function InvoiceDetailPage() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const backPath = isAdmin ? '/admin/billing' : '/billing';

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [payments, setPayments] = useState<InvoicePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(
    (location.state as { successMessage?: string } | null)?.successMessage ?? ''
  );
  const [paying, setPaying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const load = async () => {
    if (!invoiceId) return;
    setLoading(true);
    setError('');
    try {
      const data = await getInvoice(invoiceId);
      setInvoice(data.invoice);
      setPayments(data.payments);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId]);

  const handlePay = async () => {
    if (!invoice) return;
    setPaying(true);
    setError('');
    try {
      const updated = await payInvoice(invoice.id);
      setInvoice(updated);
      setSuccess('Invoice marked as paid.');
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPaying(false);
    }
  };

  const startEdit = () => {
    if (!invoice) return;
    setEditTitle(invoice.title);
    setEditAmount((invoice.amountCents / 100).toFixed(2));
    setEditDueDate(toDateInput(invoice.dueDate));
    setEditNotes(invoice.notes ?? '');
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!invoice) return;
    setSaving(true);
    setError('');
    try {
      const updated = await updateInvoice(invoice.id, {
        title: editTitle,
        amountCents: parseMoneyToCents(editAmount),
        dueDate: editDueDate || undefined,
        notes: editNotes,
      });
      setInvoice(updated);
      setEditing(false);
      setSuccess('Invoice updated.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;
  if (error && !invoice) return <ErrorMessage error={error} onRetry={load} />;
  if (!invoice) return <ErrorMessage error="Invoice not found" />;

  const canEdit = isAdmin && invoice.status !== 'paid' && invoice.status !== 'cancelled';

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageTitle back={<BackButton fallback={backPath} />}>Invoice {invoice.invoiceNumber}</PageTitle>

      {success && <SuccessMessage message={success} onDismiss={() => setSuccess('')} />}
      {error && <ErrorMessage error={error} onRetry={load} />}

      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Invoice</p>
            <h2 className="text-xl font-bold text-slate-900">{invoice.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{invoice.invoiceNumber}</p>
          </div>
          <InvoiceStatus status={invoice.status} />
        </div>

        {editing ? (
          <div className="space-y-3 rounded-lg border border-slate-200 p-3">
            <Field label="Title" required>
              <input className={inputCls} value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </Field>
            <div className="flex gap-2">
              <Field label="Amount" required>
                <input className={inputCls} value={editAmount} onChange={(e) => setEditAmount(e.target.value)} />
              </Field>
              <Field label="Due date">
                <input type="date" className={inputCls} value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} />
              </Field>
            </div>
            <Field label="Notes">
              <textarea className={inputCls} rows={3} value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
            </Field>
            <div className="flex gap-2">
              <button type="button" className={btnPrimary} disabled={saving} onClick={saveEdit}>
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button type="button" className={btnSecondary} onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-lg bg-slate-50 px-4 py-3 text-center">
              <p className="text-xs text-slate-500">Amount due</p>
              <p className="text-3xl font-bold text-slate-900">{formatMoney(invoice.amountCents)}</p>
            </div>

            <div>
              <DetailRow label="Child">{invoice.childName ?? '—'}</DetailRow>
              {invoice.childCode && <DetailRow label="Child ID">{invoice.childCode}</DetailRow>}
              <DetailRow label="Type">{invoiceTypeLabel(invoice.invoiceType)}</DetailRow>
              <DetailRow label="Created">{formatDateTime(invoice.createdAt)}</DetailRow>
              {invoice.dueDate && <DetailRow label="Due date">{formatDate(invoice.dueDate)}</DetailRow>}
              {invoice.paidAt && <DetailRow label="Paid on">{formatDateTime(invoice.paidAt)}</DetailRow>}
              {invoice.packageName && <DetailRow label="Package">{invoice.packageName}</DetailRow>}
              {invoice.planName && <DetailRow label="Subscription plan">{invoice.planName}</DetailRow>}
              {invoice.sessionDate && (
                <DetailRow label="Session">
                  {formatDate(invoice.sessionDate)}
                  {invoice.sessionDurationMinutes != null ? ` · ${invoice.sessionDurationMinutes} min` : ''}
                </DetailRow>
              )}
              {invoice.sessionId && invoice.childId && isAdmin && (
                <DetailRow label="Session record">
                  <Link
                    to={`/children/${invoice.childId}/sessions/${invoice.sessionId}`}
                    className="font-semibold text-primary hover:underline"
                  >
                    View session →
                  </Link>
                </DetailRow>
              )}
              {invoice.notes && <DetailRow label="Notes">{invoice.notes}</DetailRow>}
            </div>
          </>
        )}

        {!editing && payments.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-bold text-slate-700">Payments</h3>
            <div className="space-y-2">
              {payments.map((p) => (
                <div key={p.id} className="flex justify-between rounded-lg bg-green-50 px-3 py-2 text-sm">
                  <span>{formatDateTime(p.paidAt)}</span>
                  <span className="font-semibold">
                    {formatMoney(p.amountCents)}
                    {p.paymentMethod ? ` · ${p.paymentMethod}` : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!editing && (
          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            {isAdmin && (invoice.status === 'pending' || invoice.status === 'overdue') && (
              <button type="button" className={btnPrimary} disabled={paying} onClick={handlePay}>
                {paying ? 'Updating…' : 'Mark as paid'}
              </button>
            )}
            {canEdit && (
              <button type="button" className={btnSecondary} onClick={startEdit}>
                Edit
              </button>
            )}
            <button type="button" className={btnSecondary} onClick={() => navigate(backPath)}>
              Back to billing
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}
