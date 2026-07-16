import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getChild } from '../api/children';
import { getChildTimeline, type TimelineItem, type TimelineItemType } from '../api/timeline';
import type { Child } from '../api/types';
import { errorMessage } from '../api/client';
import { Card, Spinner, ErrorMessage, PageTitle, btnSecondary } from '../components/ui';
import BackButton from '../components/BackButton';
import { formatDateTime } from '../utils/format';
import { useAuth } from '../context/AuthContext';
import {
  ALL_SESSION_METRIC_KEYS,
  formatMetricDisplay,
  sessionMetricLabel,
} from '../utils/sessionMetrics';

const TYPE_CONFIG: Record<
  TimelineItemType,
  { label: string; icon: string; color: string; bg: string }
> = {
  appointment: { label: 'Appointments', icon: '📅', color: 'text-blue-700', bg: 'bg-blue-100' },
  session: { label: 'Session notes', icon: '📝', color: 'text-primary-dark', bg: 'bg-primary-light' },
  attendance: { label: 'Attendance', icon: '✓', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  comment: { label: 'Parent comments', icon: '💬', color: 'text-violet-700', bg: 'bg-violet-100' },
  assessment: { label: 'Assessments', icon: '📊', color: 'text-amber-700', bg: 'bg-amber-100' },
  goal_achievement: { label: 'Goal achievements', icon: '🏆', color: 'text-orange-700', bg: 'bg-orange-100' },
};

const ALL_TYPES = Object.keys(TYPE_CONFIG) as TimelineItemType[];

function itemLink(childId: string, item: TimelineItem): string | null {
  const sessionId = item.meta.sessionId as string | undefined;
  const appointmentId = item.meta.appointmentId as string | undefined;
  if (sessionId) return `/children/${childId}/sessions/${sessionId}`;
  if (item.type === 'appointment' && appointmentId) return `/children/${childId}/schedule`;
  if (item.type === 'attendance' && sessionId) return `/children/${childId}/sessions/${sessionId}`;
  return null;
}

function groupLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const itemDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = (today.getTime() - itemDay.getTime()) / 86400000;
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return 'This week';
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default function ChildTimelinePage() {
  const { user } = useAuth();
  const isParent = user?.role === 'parent';
  const { childId } = useParams<{ childId: string }>();
  const [child, setChild] = useState<Child | null>(null);
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [counts, setCounts] = useState<Record<TimelineItemType, number> | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [activeTypes, setActiveTypes] = useState<Set<TimelineItemType>>(new Set(ALL_TYPES));

  const PAGE_SIZE = 40;

  const load = useCallback(
    async (append = false) => {
      if (!childId) return;
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError('');
      try {
        const types = ALL_TYPES.filter((t) => activeTypes.has(t));
        const { items: rows, total: t, counts: c } = await getChildTimeline(childId, {
          limit: PAGE_SIZE,
          offset: append ? items.length : 0,
          types: types.length < ALL_TYPES.length ? types : undefined,
        });
        setItems((prev) => (append ? [...prev, ...rows] : rows));
        setTotal(t);
        setCounts(c);
        if (!child) setChild(await getChild(childId));
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [childId, activeTypes, items.length, child]
  );

  useEffect(() => {
    if (!childId) return;
    getChild(childId).then(setChild).catch(() => {});
  }, [childId]);

  useEffect(() => {
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId, activeTypes]);

  const grouped = useMemo(() => {
    const map = new Map<string, TimelineItem[]>();
    for (const item of items) {
      const key = groupLabel(item.occurredAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return [...map.entries()];
  }, [items]);

  const toggleType = (type: TimelineItemType) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        if (next.size === 1) return prev;
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  if (loading && items.length === 0) return <Spinner />;
  if (error && items.length === 0) return <ErrorMessage error={error} onRetry={() => load(false)} />;

  const hasMore = items.length < total;

  return (
    <div className="space-y-4">
      <PageTitle back={<BackButton fallback={childId ? `/children/${childId}` : '/children'} />}>
        Timeline{child ? ` — ${child.firstName} ${child.lastName}` : ''}
      </PageTitle>

      <p className="text-sm text-slate-600">
        Complete history in one place — appointments, sessions, attendance, comments, assessments, and milestones.
      </p>

      {counts && (
        <div className="flex flex-wrap gap-2">
          {ALL_TYPES.map((type) => {
            const cfg = TYPE_CONFIG[type];
            const on = activeTypes.has(type);
            const count = counts[type] ?? 0;
            return (
              <button
                key={type}
                type="button"
                onClick={() => toggleType(type)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  on
                    ? 'border-primary bg-primary text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <span>{cfg.icon}</span>
                {cfg.label}
                <span className={on ? 'text-white/80' : 'text-slate-400'}>({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {error && <ErrorMessage error={error} onRetry={() => load(false)} />}

      {items.length === 0 ? (
        <Card>
          <p className="text-center text-sm text-slate-500">No timeline events yet for the selected filters.</p>
        </Card>
      ) : (
        <div className="space-y-8">
          {grouped.map(([group, groupItems]) => (
            <section key={group}>
              <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">{group}</h2>
              <ol className="relative ml-1 space-y-0 border-l-2 border-slate-200">
                {groupItems.map((item) => {
                  const cfg = TYPE_CONFIG[item.type];
                  const href = childId ? itemLink(childId, item) : null;
                  const inner = (
                    <>
                      <span
                        className={`absolute left-0 top-1 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full text-sm ${cfg.bg}`}
                        aria-hidden
                      >
                        {cfg.icon}
                      </span>
                      <div className="flex flex-wrap items-start justify-between gap-2 pl-10">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className={`font-semibold ${cfg.color}`}>{item.title}</p>
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                              {cfg.label}
                            </span>
                          </div>
                          {item.summary && (
                            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{item.summary}</p>
                          )}
                          {item.actor && (
                            <p className="mt-1 text-xs text-slate-500">
                              {item.actor.fullName}
                              {item.actor.role ? ` · ${item.actor.role}` : ''}
                            </p>
                          )}
                        </div>
                        <time className="shrink-0 text-xs text-slate-400" dateTime={item.occurredAt}>
                          {formatDateTime(item.occurredAt)}
                        </time>
                      </div>
                      {item.type === 'attendance' && item.meta.outcome === 'missed' && (
                        <span className="mt-2 inline-block rounded bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                          No session logged
                        </span>
                      )}
                      {item.type === 'session' && item.meta.therapyTitle != null && (
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                          {item.meta.durationMinutes != null && (
                            <span className="rounded bg-slate-100 px-2 py-0.5">{String(item.meta.durationMinutes)} min</span>
                          )}
                          {ALL_SESSION_METRIC_KEYS.map((k) =>
                            item.meta[k] != null ? (
                              <span key={k} className="rounded bg-slate-100 px-2 py-0.5">
                                {sessionMetricLabel(k)}:{' '}
                                {formatMetricDisplay(item.meta[k], isParent ? 'parent' : 'therapist')}
                              </span>
                            ) : null
                          )}
                        </div>
                      )}
                    </>
                  );

                  return (
                    <li key={item.id} className="relative pb-8 last:pb-0">
                      {href ? (
                        <Link to={href} className="block rounded-lg py-3 pr-3 transition hover:bg-slate-50">
                          {inner}
                        </Link>
                      ) : (
                        <div className="py-3 pr-3">{inner}</div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            className={btnSecondary}
            disabled={loadingMore}
            onClick={() => load(true)}
          >
            {loadingMore ? 'Loading…' : `Load more (${items.length} of ${total})`}
          </button>
        </div>
      )}
    </div>
  );
}
