import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { listUsers, approveUser, disableUser, enableUser, deleteUser } from '../api/admin';
import type { User } from '../api/types';
import { errorMessage } from '../api/client';
import {
  Card,
  Spinner,
  ErrorMessage,
  EmptyState,
  PageTitle,
  inputCls,
  btnPrimary,
  ConfirmDialog,
} from '../components/ui';

export default function UsersListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const role = searchParams.get('role') ?? '';
  const pending = searchParams.get('pending') === '1';
  const [users, setUsers] = useState<User[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const load = async (q = query) => {
    setLoading(true);
    setError('');
    try {
      const { users: rows } = await listUsers({
        role: role || undefined,
        q: q || undefined,
        pending: pending || undefined,
        limit: 100,
      });
      setUsers(rows);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, pending]);

  useEffect(() => {
    const t = setTimeout(() => load(query), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const act = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const setFilter = (params: { role?: string; pending?: boolean }) => {
    const next = new URLSearchParams();
    if (params.role) next.set('role', params.role);
    if (params.pending) next.set('pending', '1');
    setSearchParams(next);
  };

  return (
    <div>
      <PageTitle
        actions={
          <button className={btnPrimary} onClick={() => navigate('/users/new')}>
            + Add user
          </button>
        }
      >
        Users
      </PageTitle>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
          {[
            { label: 'All', role: '', pending: false },
            { label: 'Therapists', role: 'therapist', pending: false },
            { label: 'Parents', role: 'parent', pending: false },
            { label: 'Admins', role: 'admin', pending: false },
            { label: 'Pending approval', role: '', pending: true },
          ].map((f) => {
            const active = role === f.role && pending === f.pending;
            return (
              <button
                key={f.label}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  active ? 'bg-white text-primary shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
                onClick={() => setFilter({ role: f.role || undefined, pending: f.pending })}
              >
                {f.label}
              </button>
            );
          })}
        </div>
        <input
          className={`${inputCls} max-w-xs`}
          placeholder="Search users…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorMessage error={error} onRetry={() => load()} />
      ) : users.length === 0 ? (
        <EmptyState>No users found</EmptyState>
      ) : (
        <div className="space-y-2">
          {users.map((u) => {
            const isPending = !u.approvedAt && u.role !== 'admin';
            const isDisabled = Boolean(u.disabledAt);
            return (
              <Card key={u.id} className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-light text-sm font-bold text-primary-dark">
                    {u.fullName
                      .split(' ')
                      .map((p) => p[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">
                      {u.fullName}
                      {u.title && <span className="ml-1 text-sm font-normal text-slate-500">({u.title})</span>}
                    </p>
                    <p className="text-xs text-slate-500">
                      {u.email} • <span className="capitalize">{u.role}</span>
                      {isPending && <span className="ml-1 font-semibold text-amber-600">• pending approval</span>}
                      {isDisabled && <span className="ml-1 font-semibold text-red-600">• disabled</span>}
                    </p>
                    {u.role === 'parent' && (
                      <p className="mt-0.5 text-xs text-slate-500">
                        {u.childNames && u.childNames.length > 0
                          ? `Children: ${u.childNames.join(', ')}`
                          : 'No children assigned'}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {isPending && (
                    <button
                      className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
                      onClick={() => act(() => approveUser(u.id))}
                    >
                      Approve
                    </button>
                  )}
                  <button
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    onClick={() => navigate(`/users/${u.id}/edit`)}
                  >
                    Edit
                  </button>
                  {u.role !== 'admin' &&
                    (isDisabled ? (
                      <button
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        onClick={() => act(() => enableUser(u.id))}
                      >
                        Enable
                      </button>
                    ) : (
                      <button
                        className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50"
                        onClick={() => act(() => disableUser(u.id))}
                      >
                        Disable
                      </button>
                    ))}
                  {u.role !== 'admin' && (
                    <button
                      className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                      onClick={() => setDeleteTarget(u)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget != null}
        title="Delete user"
        message={`Are you sure you want to delete ${deleteTarget?.fullName}?`}
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          const id = deleteTarget!.id;
          setDeleteTarget(null);
          act(() => deleteUser(id));
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
