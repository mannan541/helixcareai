import { useEffect, useMemo, useState } from 'react';
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

const METRIC_KEYS = ['engagement', 'focus', 'communication'] as const;
const COLORS: Record<string, string> = {
  engagement: '#2563eb',
  focus: '#16a34a',
  communication: '#d97706',
};

export default function AnalyticsPage() {
  const { childId } = useParams<{ childId: string }>();
  const navigate = useNavigate();
  const [child, setChild] = useState<Child | null>(null);
  const [sessions, setSessions] = useState<SessionMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  const chartData = useMemo(() => {
    return [...sessions]
      .sort((a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime())
      .map((s) => {
        const m = s.structuredMetrics ?? {};
        const row: Record<string, unknown> = {
          date: formatDate(s.sessionDate),
          duration: s.durationMinutes ?? 0,
        };
        for (const k of METRIC_KEYS) {
          const v = m[k];
          if (typeof v === 'number') row[k] = v;
          else if (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v))) row[k] = Number(v);
        }
        return row;
      });
  }, [sessions]);

  const averages = useMemo(() => {
    const out: Record<string, number | null> = {};
    for (const k of METRIC_KEYS) {
      const vals = chartData.map((d) => d[k]).filter((v): v is number => typeof v === 'number');
      out[k] = vals.length > 0 ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
    }
    return out;
  }, [chartData]);

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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card>
              <p className="text-xs text-slate-500">Sessions</p>
              <p className="text-2xl font-bold text-primary">{sessions.length}</p>
            </Card>
            {METRIC_KEYS.map((k) => (
              <Card key={k}>
                <p className="text-xs capitalize text-slate-500">Avg {k}</p>
                <p className="text-2xl font-bold" style={{ color: COLORS[k] }}>
                  {averages[k] ?? '—'}
                </p>
              </Card>
            ))}
          </div>

          <Card>
            <h2 className="mb-3 font-bold">Metrics over time</h2>
            <div className="h-72 w-full">
              <ResponsiveContainer>
                <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  {METRIC_KEYS.map((k) => (
                    <Line
                      key={k}
                      type="monotone"
                      dataKey={k}
                      stroke={COLORS[k]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <h2 className="mb-3 font-bold">Session duration (minutes)</h2>
            <div className="h-56 w-full">
              <ResponsiveContainer>
                <BarChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="duration" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
