export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** "14:15:00" or "14:15" -> "2:15 PM" */
export function formatTime(time: string | null | undefined): string {
  if (!time) return '—';
  const m = time.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return time;
  let h = parseInt(m[1], 10);
  const min = m[2];
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 === 0 ? 12 : h % 12;
  return `${h}:${min} ${ampm}`;
}

export function toDateInput(value: string | Date | null | undefined): string {
  if (!value) return '';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

export function todayInput(): string {
  return toDateInput(new Date());
}

export { sessionMetricLabel } from './sessionMetrics';

/** Format amount stored in cents (e.g. 15000 → 150.00) */
export function formatMoney(cents: number, _currency?: string): string {
  const amount = cents / 100;
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Parse user input like "150" or "150.50" to cents */
export function parseMoneyToCents(value: string): number {
  const n = parseFloat(value.replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}
