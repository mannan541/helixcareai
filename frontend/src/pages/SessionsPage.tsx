import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { listSessionsByChild } from '../api/sessions';
import { getChild } from '../api/children';
import type { Child, Session } from '../api/types';
import { errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Card, Field, Spinner, ErrorMessage, EmptyState, PageTitle, btnPrimary, btnSecondary, inputCls } from '../components/ui';
import BackButton from '../components/BackButton';
import { formatDate } from '../utils/format';
import {
  CORE_SESSION_METRICS,
  formatMetricDisplay,
  sessionMetricLabel,
} from '../utils/sessionMetrics';

function sessionPreview(s: { notesText: string | null; structuredMetrics?: Record<string, unknown> }, isParent: boolean): string | null {
  try {
    const m = (s.structuredMetrics as Record<string, unknown>) || {};
    const parentSummary = String(m.parentSummary ?? '').trim();
    if (isParent && parentSummary) return parentSummary;
    if (parentSummary) return parentSummary;
    return s.notesText?.trim() || null;
  } catch {
    return null;
  }
}

export default function SessionsPage() {
  const { childId } = useParams<{ childId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [child, setChild] = useState<Child | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [therapistId, setTherapistId] = useState('');
  const [therapyType, setTherapyType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const load = async () => {
    if (!childId) return;
    setLoading(true);
    setError('');
    try {
      const [c, { sessions: rows }] = await Promise.all([getChild(childId), listSessionsByChild(childId)]);
      setChild(c);
      setSessions(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery || ''), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage error={error} onRetry={load} />;
  if (!childId) return null;

  const canLog = user?.role === 'admin' || user?.role === 'therapist';
  const isParent = user?.role === 'parent';

  const therapistOptions: Array<{ id: string; name: string }> = [];
  try {
    const map = new Map<string, string>();
    for (const s of sessions) {
      const tid = (s as any).therapistUser?.id;
      const tname = (s as any).therapistUser?.fullName;
      if (tid && tname) map.set(tid, tname);
    }
    for (const [id, name] of Array.from(map.entries())) {
      therapistOptions.push({ id, name });
    }
    therapistOptions.sort((a, b) => a.name.localeCompare(b.name));
  } catch {}

  const therapyTypeOptions: string[] = [];
  try {
    const set = new Set<string>();
    for (const s of sessions) {
      const m = ((s as any).structuredMetrics as Record<string, unknown>) || {};
      const t = ((m.therapyTitle as string | undefined) || (m.therapyType as string | undefined));
      if (t && String(t).trim()) set.add(String(t).trim());
    }
    for (const t of Array.from(set)) therapyTypeOptions.push(t);
    therapyTypeOptions.sort((a, b) => a.localeCompare(b));
  } catch {}

  const filtered = sessions.filter((s) => {
    try {
      if (fromDate && (s as any).sessionDate < fromDate) return false;
      if (toDate && (s as any).sessionDate > toDate) return false;
      if (therapistId) {
        const tid = (s as any).therapistId || (s as any).therapistUser?.id;
        if (tid !== therapistId) return false;
      }
      if (therapyType) {
        const m = ((s as any).structuredMetrics as Record<string, unknown>) || {};
        const t = ((m.therapyTitle as string | undefined) || (m.therapyType as string | undefined) || '').trim();
        if (t !== therapyType) return false;
      }
      if (debouncedSearch && debouncedSearch.trim()) {
        const q = debouncedSearch.trim().toLowerCase();
        const m = ((s as any).structuredMetrics as Record<string, unknown>) || {};
        const title = String(m.sessionTitle || m.title || '').toLowerCase();
        const notes = String((s as any).notesText || '').toLowerCase();
        const clinical = String(m.clinicalNotes || m.notesClinical || '').toLowerCase();
        const therapistNotes = String(m.therapistNotes || '').toLowerCase();
        const haystack = [title, notes, clinical, therapistNotes].join(' ');
        if (!haystack.includes(q)) return false;
      }
      return true;
    } catch {
      return true;
    }
  });

  const hasActiveFilters = Boolean(fromDate || toDate || therapistId || therapyType || (searchQuery && searchQuery.trim()));

  const clearAllFilters = () => {
    setFromDate('');
    setToDate('');
    setTherapistId('');
    setTherapyType('');
    setSearchQuery('');
    setDebouncedSearch('');
  };

  return (
    <div>
      <PageTitle
        back={<BackButton fallback={`/children/${childId}`} />}
        actions={
          canLog && (
            <button className={btnPrimary} onClick={() => navigate(`/children/${childId}/sessions/new`)}>
              + Log session
            </button>
          )
        }
      >
        Sessions{child ? ` — ${child.firstName} ${child.lastName}` : ''}
      </PageTitle>

      {sessions && sessions.length > 0 && (
        <div className="mb-3 flex flex-wrap items-end gap-2">
          <Field label="From">
            <input type="date" className={inputCls} value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </Field>
          <Field label="To">
            <input type="date" className={inputCls} value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </Field>
          <Field label="Therapist">
            <select className={inputCls} value={therapistId} onChange={(e) => setTherapistId(e.target.value)}>
              <option value="">All</option>
              {therapistOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Therapy type">
            <select className={inputCls} value={therapyType} onChange={(e) => setTherapyType(e.target.value)}>
              <option value="">All</option>
              {therapyTypeOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Search">
            <input
              type="text"
              className={inputCls}
              placeholder="Search sessions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </Field>
          {hasActiveFilters && (
            <button type="button" className={btnSecondary} onClick={clearAllFilters}>
              Clear
            </button>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState>
          {sessions && sessions.length === 0
            ? 'No sessions logged yet'
            : hasActiveFilters
            ? 'No sessions match the current filters'
            : 'No sessions in this date range'}
        </EmptyState>
      ) : (
        <div className="space-y-2">
          {filtered.map((s: any) => {
            const metrics = ((s.structuredMetrics as Record<string, unknown>) || {});
            const therapy = metrics.therapyTitle as string | undefined;
            const timeSlot = metrics.timeSlot as string | undefined;
            return (
              <Link key={s.id} to={`/children/${childId}/sessions/${s.id}`} className="block">
                <Card className="transition hover:border-primary hover:shadow">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {formatDate(s.sessionDate)}
                        {therapy && (
                          <span className="ml-2 rounded bg-primary-light px-2 py-0.5 text-xs font-semibold text-primary-dark">
                            {therapy}
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {s.durationMinutes ? `${s.durationMinutes} min` : 'Duration n/a'}
                        {timeSlot ? ` • ${timeSlot}` : ''}
                        {s.therapistUser ? ` • ${s.therapistUser.fullName}` : ''}
                      </p>
                    </div>
                    <div className="flex gap-3 text-xs text-slate-600">
                      {CORE_SESSION_METRICS.map((k) =>
                        metrics[k] != null ? (
                          <span key={k} className="rounded bg-slate-100 px-2 py-1">
                            {sessionMetricLabel(k)}:{' '}
                            <b>{formatMetricDisplay(metrics[k], isParent ? 'parent' : 'therapist')}</b>
                          </span>
                        ) : null
                      )}
                    </div>
                  </div>
                  {(() => {
                    const preview = sessionPreview(s, isParent);
                    return preview ? (
                      <p className="mt-2 line-clamp-2 text-sm text-slate-600">{preview}</p>
                    ) : null;
                  })()}
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
