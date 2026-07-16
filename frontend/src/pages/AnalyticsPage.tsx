import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';
import { childMetrics } from '../api/analytics';
import { getChild } from '../api/children';
import type { Child, SessionMetric } from '../api/types';
import { errorMessage } from '../api/client';
import { Card, Spinner, ErrorMessage, EmptyState, PageTitle, btnSecondary } from '../components/ui';
import BackButton from '../components/BackButton';
import { formatDate } from '../utils/format';
import {
  ALL_SESSION_METRIC_KEYS,
  METRIC_CHART_COLORS,
  normalizeStoredScore,
  sessionMetricLabel,
  formatMetricForParent,
} from '../utils/sessionMetrics';

type ChartRow = {
  sessionId: string;
  date: string;
  duration: number;
  [key: string]: string | number;
};

const clickableCard =
  'cursor-pointer text-left transition hover:border-primary hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

function latestSessionWithMetric(sessions: SessionMetric[], metricKey: string): SessionMetric | undefined {
  return [...sessions]
    .filter((s) => normalizeStoredScore(s.structuredMetrics?.[metricKey]) != null)
    .sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime())[0];
}

function ChartTooltip({
  active,
  payload,
  label,
  onViewSession,
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: string | number; value?: number; payload?: ChartRow }>;
  label?: string;
  onViewSession: (sessionId: string) => void;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as ChartRow;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-slate-900">{label}</p>
      {payload.map((p) => (
        <p key={String(p.dataKey)} className="text-slate-600">
          {sessionMetricLabel(String(p.dataKey))}: {p.value}/10
        </p>
      ))}
      {row.duration != null && <p className="text-slate-600">Duration: {row.duration} min</p>}
      <button
        type="button"
        className="mt-2 font-semibold text-primary hover:underline"
        onClick={(e) => {
          e.stopPropagation();
          onViewSession(row.sessionId);
        }}
      >
        View session →
      </button>
    </div>
  );
}

function DurationTooltip({
  active,
  payload,
  label,
  onViewSession,
}: {
  active?: boolean;
  payload?: Array<{ value?: number; payload?: ChartRow }>;
  label?: string;
  onViewSession: (sessionId: string) => void;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as ChartRow;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-slate-900">{label}</p>
      <p className="text-slate-600">Duration: {payload[0].value} min</p>
      <button
        type="button"
        className="mt-2 font-semibold text-primary hover:underline"
        onClick={(e) => {
          e.stopPropagation();
          onViewSession(row.sessionId);
        }}
      >
        View session →
      </button>
    </div>
  );
}

export default function AnalyticsPage() {
  const { childId } = useParams<{ childId: string }>();
  const navigate = useNavigate();
  const [child, setChild] = useState<Child | null>(null);
  const [sessions, setSessions] = useState<SessionMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const goToSession = useCallback(
    (sessionId: string) => {
      if (!childId) return;
      navigate(`/children/${childId}/sessions/${sessionId}`);
    },
    [childId, navigate]
  );

  const goToSessions = useCallback(() => {
    if (!childId) return;
    navigate(`/children/${childId}/sessions`);
  }, [childId, navigate]);

  const load = async () => {
    if (!childId) return;
    setLoading(true);
    setError('');
    try {
      const [c, rows] = await Promise.all([getChild(childId), childMetrics(childId)]);
      setChild(c);
      setSessions(rows);
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

  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime()),
    [sessions]
  );

  const activeMetricKeys = useMemo(() => {
    const present = new Set<string>();
    for (const s of sessions) {
      const m = s.structuredMetrics ?? {};
      for (const k of ALL_SESSION_METRIC_KEYS) {
        if (normalizeStoredScore(m[k]) != null) present.add(k);
      }
    }
    return ALL_SESSION_METRIC_KEYS.filter((k) => present.has(k));
  }, [sessions]);

  const chartData = useMemo((): ChartRow[] => {
    return sortedSessions.map((s) => {
      const m = s.structuredMetrics ?? {};
      const row: ChartRow = {
        sessionId: s.id,
        date: formatDate(s.sessionDate),
        duration: s.durationMinutes ?? 0,
      };
      for (const k of activeMetricKeys) {
        const stored = normalizeStoredScore(m[k]);
        if (stored != null) row[k] = stored;
      }
      return row;
    });
  }, [sortedSessions, activeMetricKeys]);

  const averages = useMemo(() => {
    const out: Record<string, number | null> = {};
    for (const k of activeMetricKeys) {
      const vals = chartData.map((d) => d[k]).filter((v): v is number => typeof v === 'number');
      out[k] = vals.length > 0 ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
    }
    return out;
  }, [chartData, activeMetricKeys]);

  const handleChartClick = useCallback(
    (state: unknown) => {
      const chartState = state as { activePayload?: Array<{ payload?: ChartRow }> } | null;
      const sessionId = chartState?.activePayload?.[0]?.payload?.sessionId;
      if (sessionId) goToSession(sessionId);
    },
    [goToSession]
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage error={error} onRetry={load} />;

  return (
    <div className="space-y-4">
      <PageTitle
        back={<BackButton fallback={`/children/${childId}`} />}
        actions={
          <button className={btnSecondary} onClick={() => navigate(`/children/${childId}/report`)}>
            📄 Export report
          </button>
        }
      >
        Performance{child ? ` — ${child.firstName} ${child.lastName}` : ''}
      </PageTitle>

      {sessions.length === 0 ? (
        <EmptyState>No session data yet. Log sessions with metrics to see charts here.</EmptyState>
      ) : (
        <>
          <p className="text-xs text-slate-500">Tap any summary card, chart point, or session row to open details.</p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <button type="button" className={`${clickableCard} block w-full`} onClick={goToSessions}>
              <Card>
                <p className="text-xs text-slate-500">Sessions</p>
                <p className="text-2xl font-bold text-primary">{sessions.length}</p>
                <p className="mt-1 text-xs text-primary">View all sessions →</p>
              </Card>
            </button>
            {activeMetricKeys.map((k) => {
              const latest = latestSessionWithMetric(sessions, k);
              return (
                <button
                  key={k}
                  type="button"
                  className={`${clickableCard} block w-full`}
                  onClick={() => (latest ? goToSession(latest.id) : goToSessions())}
                  title={latest ? `Latest session with ${sessionMetricLabel(k)}` : 'View sessions'}
                >
                  <Card>
                    <p className="text-xs text-slate-500">Avg {sessionMetricLabel(k)}</p>
                    <p
                      className="text-2xl font-bold"
                      style={{ color: METRIC_CHART_COLORS[k as keyof typeof METRIC_CHART_COLORS] ?? '#64748b' }}
                    >
                      {averages[k] != null ? formatMetricForParent(averages[k]) : '—'}
                    </p>
                    {latest && (
                      <p className="mt-1 text-xs text-primary">
                        Latest: {formatDate(latest.sessionDate)} →
                      </p>
                    )}
                  </Card>
                </button>
              );
            })}
          </div>

          <Card>
            <h2 className="mb-1 font-bold">Metrics over time</h2>
            <p className="mb-3 text-xs text-slate-500">
              Click a point on the chart to open that session. Scores are on a 0–10 scale.
            </p>
            <div className="h-72 w-full cursor-pointer">
              <ResponsiveContainer>
                <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }} onClick={handleChartClick}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis
                    domain={[0, 10]}
                    tick={{ fontSize: 11 }}
                    label={{ value: '/10', angle: -90, position: 'insideLeft', fontSize: 10 }}
                  />
                  <Tooltip content={<ChartTooltip onViewSession={goToSession} />} />
                  <Legend formatter={(value) => sessionMetricLabel(String(value))} />
                  {activeMetricKeys.map((k) => (
                    <Line
                      key={k}
                      type="monotone"
                      dataKey={k}
                      name={k}
                      stroke={METRIC_CHART_COLORS[k as keyof typeof METRIC_CHART_COLORS] ?? '#64748b'}
                      strokeWidth={2}
                      dot={{ r: 4, strokeWidth: 2 }}
                      activeDot={{ r: 7, cursor: 'pointer' }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <h2 className="mb-1 font-bold">Session duration (minutes)</h2>
            <p className="mb-3 text-xs text-slate-500">Click a bar to open that session.</p>
            <div className="h-56 w-full cursor-pointer">
              <ResponsiveContainer>
                <BarChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }} onClick={handleChartClick}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<DurationTooltip onViewSession={goToSession} />} />
                  <Bar dataKey="duration" fill="#2563eb" radius={[4, 4, 0, 0]} cursor="pointer" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <h2 className="mb-3 font-bold">Sessions in chart</h2>
            <div className="divide-y divide-slate-100">
              {[...sortedSessions].reverse().map((s) => {
                const m = s.structuredMetrics ?? {};
                const metrics = activeMetricKeys
                  .map((k) => {
                    const v = normalizeStoredScore(m[k]);
                    return v != null ? `${sessionMetricLabel(k)} ${formatMetricForParent(v)}` : null;
                  })
                  .filter(Boolean);
                return (
                  <button
                    key={s.id}
                    type="button"
                    className="flex w-full flex-wrap items-center justify-between gap-2 py-3 text-left transition hover:bg-slate-50"
                    onClick={() => goToSession(s.id)}
                  >
                    <div>
                      <p className="font-semibold text-slate-900">{formatDate(s.sessionDate)}</p>
                      <p className="text-xs text-slate-500">
                        {s.durationMinutes != null ? `${s.durationMinutes} min` : 'Duration n/a'}
                        {metrics.length > 0 ? ` · ${metrics.join(' · ')}` : ''}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-primary">Open →</span>
                  </button>
                );
              })}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
