import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  therapistAnalyticsList,
  sessionsMissingNotes,
  childrenGoalsStale,
  childrenNotAttended,
  clinicSummary,
  type TherapistAnalytics,
  type MissingNotesSession,
  type StaleGoalChild,
  type NotAttendedChild,
  type ClinicSummary,
} from '../api/analytics';
import { errorMessage } from '../api/client';
import { Card, Field, Spinner, ErrorMessage, EmptyState, PageTitle, btnSecondary, inputCls } from '../components/ui';
import { formatDate, formatMoney } from '../utils/format';

type Tab = 'overview' | 'missing-notes' | 'stale-goals' | 'inactive';

type SortKey = keyof Pick<
  TherapistAnalytics,
  | 'fullName'
  | 'sessionsTotal'
  | 'sessionsCompleted'
  | 'sessionsCancelled'
  | 'utilizationPct'
  | 'documentationCompletionPct'
  | 'avgSessionDurationMinutes'
  | 'childrenAssigned'
  | 'goalsUpdatedPct'
  | 'parentFeedbackAvg'
>;

function pctCell(v: number | null): string {
  return v == null ? '—' : `${v}%`;
}

function SortHeader({
  label,
  sortKey,
  currentKey,
  currentDir,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  currentDir: 'asc' | 'desc';
  onSort: (key: SortKey) => void;
}) {
  const active = currentKey === sortKey;
  return (
    <th
      className="cursor-pointer whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-700"
      onClick={() => onSort(sortKey)}
    >
      {label} {active ? (currentDir === 'asc' ? '↑' : '↓') : ''}
    </th>
  );
}

export default function TherapistAnalyticsPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [therapists, setTherapists] = useState<TherapistAnalytics[]>([]);
  const [summary, setSummary] = useState<ClinicSummary | null>(null);
  const [missingNotes, setMissingNotes] = useState<MissingNotesSession[]>([]);
  const [staleGoals, setStaleGoals] = useState<StaleGoalChild[]>([]);
  const [inactive, setInactive] = useState<NotAttendedChild[]>([]);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('sessionsTotal');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const load = async (opts?: { silent?: boolean }) => {
    if (opts?.silent) setRefreshing(true);
    else setInitialLoading(true);
    setError('');
    const failures: string[] = [];

    const [tR, sR, mR, gR, iR] = await Promise.allSettled([
      therapistAnalyticsList({ from: from || undefined, to: to || undefined }),
      clinicSummary({ from: from || undefined, to: to || undefined }),
      sessionsMissingNotes({}),
      childrenGoalsStale({}),
      childrenNotAttended({}),
    ]);

    if (tR.status === 'fulfilled') setTherapists(tR.value);
    else {
      setTherapists([]);
      failures.push(errorMessage(tR.reason));
    }
    if (sR.status === 'fulfilled') setSummary(sR.value);
    else {
      setSummary(null);
      failures.push(errorMessage(sR.reason));
    }
    if (mR.status === 'fulfilled') setMissingNotes(mR.value);
    else {
      setMissingNotes([]);
      failures.push(errorMessage(mR.reason));
    }
    if (gR.status === 'fulfilled') setStaleGoals(gR.value);
    else {
      setStaleGoals([]);
      failures.push(errorMessage(gR.reason));
    }
    if (iR.status === 'fulfilled') setInactive(iR.value);
    else {
      setInactive([]);
      failures.push(errorMessage(iR.reason));
    }

    if (failures.length > 0) setError([...new Set(failures)].join('\n'));
    setInitialLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sortedTherapists = [...therapists].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    const cmp = typeof av === 'string' ? av.localeCompare(String(bv)) : (av as number) - (bv as number);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'missing-notes', label: `Missing notes${missingNotes.length ? ` (${missingNotes.length})` : ''}` },
    { id: 'stale-goals', label: `Stale goals${staleGoals.length ? ` (${staleGoals.length})` : ''}` },
    { id: 'inactive', label: `Inactive children${inactive.length ? ` (${inactive.length})` : ''}` },
  ];

  return (
    <div className="space-y-4">
      <PageTitle>Therapist Analytics</PageTitle>
      <p className="text-sm text-slate-600">
        Per-therapist performance, documentation completion, and operational gaps — the same data the AI assistant
        uses to answer clinic-wide questions.
      </p>

      {error && <ErrorMessage error={error} onRetry={() => load({ silent: true })} />}

      <Card>
        <div className="flex flex-wrap items-end gap-2">
          <Field label="From">
            <input type="date" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="To">
            <input type="date" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
          <button type="button" className={btnSecondary} disabled={refreshing} onClick={() => load({ silent: true })}>
            Apply
          </button>
          {(from || to) && (
            <button
              type="button"
              className={btnSecondary}
              onClick={async () => {
                setFrom('');
                setTo('');
                setInitialLoading(true);
                setError('');
                try {
                  const [tR, sR] = await Promise.all([therapistAnalyticsList({}), clinicSummary({})]);
                  setTherapists(tR);
                  setSummary(sR);
                } catch (err) {
                  setError(errorMessage(err));
                } finally {
                  setInitialLoading(false);
                }
              }}
            >
              Clear
            </button>
          )}
          {refreshing && <span className="self-center text-xs text-slate-400">Refreshing…</span>}
        </div>
      </Card>

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
      </div>

      {initialLoading ? (
        <Spinner />
      ) : (
        <>
          {tab === 'overview' && (
            <div className="space-y-4">
              {summary && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Card>
                    <p className="text-xs text-slate-500">Completed sessions{from || to ? '' : ' (all-time)'}</p>
                    <p className="text-2xl font-bold text-slate-900">{summary.totalSessionsCompleted}</p>
                  </Card>
                  <Card>
                    <p className="text-xs text-slate-500">Cancellations</p>
                    <p className="text-2xl font-bold text-red-600">{summary.totalCancellations}</p>
                  </Card>
                  <Card>
                    <p className="text-xs text-slate-500">Revenue (paid)</p>
                    <p className="text-2xl font-bold text-green-700">
                      {formatMoney(summary.revenueCents, summary.currency)}
                    </p>
                  </Card>
                  <Card>
                    <p className="text-xs text-slate-500">Active children</p>
                    <p className="text-2xl font-bold text-slate-900">{summary.childrenActive}</p>
                  </Card>
                </div>
              )}

              {therapists.length === 0 ? (
                <EmptyState>
                  <p className="font-semibold text-slate-700">No therapists found</p>
                </EmptyState>
              ) : (
                <Card className="overflow-x-auto p-0">
                  <table className="w-full min-w-[900px] text-sm">
                    <thead className="border-b border-slate-200">
                      <tr>
                        <SortHeader label="Therapist" sortKey="fullName" currentKey={sortKey} currentDir={sortDir} onSort={onSort} />
                        <SortHeader label="Sessions" sortKey="sessionsTotal" currentKey={sortKey} currentDir={sortDir} onSort={onSort} />
                        <SortHeader label="Completed" sortKey="sessionsCompleted" currentKey={sortKey} currentDir={sortDir} onSort={onSort} />
                        <SortHeader label="Cancelled" sortKey="sessionsCancelled" currentKey={sortKey} currentDir={sortDir} onSort={onSort} />
                        <SortHeader label="Utilization" sortKey="utilizationPct" currentKey={sortKey} currentDir={sortDir} onSort={onSort} />
                        <SortHeader label="Documentation" sortKey="documentationCompletionPct" currentKey={sortKey} currentDir={sortDir} onSort={onSort} />
                        <SortHeader label="Avg duration" sortKey="avgSessionDurationMinutes" currentKey={sortKey} currentDir={sortDir} onSort={onSort} />
                        <SortHeader label="Children" sortKey="childrenAssigned" currentKey={sortKey} currentDir={sortDir} onSort={onSort} />
                        <SortHeader label="Goals updated" sortKey="goalsUpdatedPct" currentKey={sortKey} currentDir={sortDir} onSort={onSort} />
                        <SortHeader label="Parent feedback" sortKey="parentFeedbackAvg" currentKey={sortKey} currentDir={sortDir} onSort={onSort} />
                      </tr>
                    </thead>
                    <tbody>
                      {sortedTherapists.map((t) => (
                        <tr key={t.therapistId} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                          <td className="whitespace-nowrap px-3 py-2 font-semibold text-slate-900">
                            {t.fullName}
                            {t.title && <span className="ml-1 font-normal text-slate-500">({t.title})</span>}
                          </td>
                          <td className="px-3 py-2">{t.sessionsTotal}</td>
                          <td className="px-3 py-2">{t.sessionsCompleted}</td>
                          <td className="px-3 py-2">{t.sessionsCancelled}</td>
                          <td className="px-3 py-2">{pctCell(t.utilizationPct)}</td>
                          <td className="px-3 py-2">{pctCell(t.documentationCompletionPct)}</td>
                          <td className="px-3 py-2">
                            {t.avgSessionDurationMinutes != null ? `${t.avgSessionDurationMinutes} min` : '—'}
                          </td>
                          <td className="px-3 py-2">{t.childrenAssigned}</td>
                          <td className="px-3 py-2">{pctCell(t.goalsUpdatedPct)}</td>
                          <td className="px-3 py-2">
                            {t.parentFeedbackAvg != null ? `${t.parentFeedbackAvg}/5 (${t.parentFeedbackCount})` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              )}
            </div>
          )}

          {tab === 'missing-notes' && (
            <div className="space-y-2">
              {missingNotes.length === 0 ? (
                <EmptyState>
                  <p className="font-semibold text-slate-700">No sessions missing notes</p>
                  <p className="mt-1 text-slate-500">Every recent session has narrative notes or full metrics recorded.</p>
                </EmptyState>
              ) : (
                missingNotes.map((s) => (
                  <Link key={s.id} to={`/children/${s.childId}/sessions/${s.id}`} className="block">
                    <Card className="flex flex-wrap items-center justify-between gap-2 transition hover:border-primary hover:shadow-sm">
                      <div>
                        <p className="font-semibold text-slate-900">{s.childName}</p>
                        <p className="text-xs text-slate-500">
                          {formatDate(s.sessionDate)}
                          {s.durationMinutes ? ` · ${s.durationMinutes} min` : ''}
                          {s.therapistName ? ` · ${s.therapistName}` : ''}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-primary">View →</span>
                    </Card>
                  </Link>
                ))
              )}
            </div>
          )}

          {tab === 'stale-goals' && (
            <div className="space-y-2">
              {staleGoals.length === 0 ? (
                <EmptyState>
                  <p className="font-semibold text-slate-700">No children with stale goals</p>
                  <p className="mt-1 text-slate-500">Every assigned child has had recent goal-related progress.</p>
                </EmptyState>
              ) : (
                staleGoals.map((c) => (
                  <Link key={c.childId} to={`/children/${c.childId}`} className="block">
                    <Card className="flex flex-wrap items-center justify-between gap-2 transition hover:border-primary hover:shadow-sm">
                      <div>
                        <p className="font-semibold text-slate-900">{c.childName}</p>
                        <p className="text-xs text-slate-500">Therapist: {c.therapistName || 'Unassigned'}</p>
                      </div>
                      <span className="text-sm font-semibold text-primary">View →</span>
                    </Card>
                  </Link>
                ))
              )}
            </div>
          )}

          {tab === 'inactive' && (
            <div className="space-y-2">
              {inactive.length === 0 ? (
                <EmptyState>
                  <p className="font-semibold text-slate-700">No inactive children</p>
                  <p className="mt-1 text-slate-500">All active children have attended a session recently.</p>
                </EmptyState>
              ) : (
                inactive.map((c) => (
                  <Link key={c.childId} to={`/children/${c.childId}`} className="block">
                    <Card className="flex flex-wrap items-center justify-between gap-2 transition hover:border-primary hover:shadow-sm">
                      <div>
                        <p className="font-semibold text-slate-900">{c.childName}</p>
                        <p className="text-xs text-slate-500">
                          {c.lastCompletedAppointmentDate
                            ? `Last attended ${formatDate(c.lastCompletedAppointmentDate)}`
                            : 'Never attended a session'}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-primary">View →</span>
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
