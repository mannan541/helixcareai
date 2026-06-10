import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listChildren } from '../api/children';
import type { Child } from '../api/types';
import { errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Card, Spinner, ErrorMessage, EmptyState, PageTitle, btnPrimary, inputCls, StatusBadge } from '../components/ui';
import { formatDate } from '../utils/format';

export default function ChildrenListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [children, setChildren] = useState<Child[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async (q?: string) => {
    setLoading(true);
    setError('');
    try {
      const { children: rows } = await listChildren({ q: q || undefined });
      setChildren(rows);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(query), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const canAdd = user?.role === 'admin' || user?.role === 'therapist';

  return (
    <div>
      <PageTitle
        actions={
          canAdd && (
            <button className={btnPrimary} onClick={() => navigate('/children/new')}>
              + Add child
            </button>
          )
        }
      >
        Children
      </PageTitle>

      <input
        className={`${inputCls} mb-4 max-w-md`}
        placeholder="Search children…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorMessage error={error} onRetry={() => load(query)} />
      ) : children.length === 0 ? (
        <EmptyState>No children found</EmptyState>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {children.map((c) => (
            <Link key={c.id} to={`/children/${c.id}`}>
              <Card className="h-full transition hover:border-primary hover:shadow">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-light text-lg font-bold text-primary-dark">
                    {c.firstName[0]?.toUpperCase()}
                    {c.lastName[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">
                      {c.firstName} {c.lastName}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {c.childCode ? `${c.childCode} • ` : ''}
                      DOB: {formatDate(c.dateOfBirth)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  {c.diagnosis && <span className="rounded bg-slate-100 px-2 py-0.5">{c.diagnosis}</span>}
                  {c.therapyStatus && <StatusBadge status={c.therapyStatus} />}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
