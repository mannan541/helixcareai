import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { listSessionsByChild } from '../api/sessions';
import { getChild } from '../api/children';
import type { Child, Session } from '../api/types';
import { errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Card, Spinner, ErrorMessage, EmptyState, PageTitle, btnPrimary } from '../components/ui';
import BackButton from '../components/BackButton';
import { formatDate } from '../utils/format';
import {
  CORE_SESSION_METRICS,
  formatMetricDisplay,
  sessionMetricLabel,
} from '../utils/sessionMetrics';

function sessionPreview(s: { notesText: string | null; structuredMetrics?: Record<string, unknown> }, isParent: boolean): string | null {
  const m = s.structuredMetrics ?? {};
  const parentSummary = String(m.parentSummary ?? '').trim();
  if (isParent && parentSummary) return parentSummary;
  if (parentSummary) return parentSummary;
  return s.notesText?.trim() || null;
}

export default function SessionsPage() {
  const { childId } = useParams<{ childId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [child, setChild] = useState<Child | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    if (!childId) return;
    setLoading(true);
    setError('');
    try {
      const [c, { sessions: rows }] = await Promise.all([getChild(childId), listSessionsByChild(childId)]);
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

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage error={error} onRetry={load} />;
  if (!childId) return null;

  const canLog = user?.role === 'admin' || user?.role === 'therapist';
  const isParent = user?.role === 'parent';

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

      {sessions.length === 0 ? (
        <EmptyState>No sessions logged yet</EmptyState>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => {
            const metrics = s.structuredMetrics ?? {};
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
