import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as authApi from '../api/auth';
import * as adminApi from '../api/admin';
import { listAppointments, updateAppointmentStatus } from '../api/appointments';
import type { Appointment } from '../api/types';
import { errorMessage } from '../api/client';
import { Card, Spinner, ErrorMessage, StatusBadge, EmptyState } from '../components/ui';
import { formatDate, formatTime } from '../utils/format';

function StatCard({
  title,
  count,
  icon,
  to,
}: {
  title: string;
  count?: number | null;
  icon: ReactNode;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-primary hover:shadow"
    >
      <div className="text-2xl">{icon}</div>
      <p className="mt-3 text-sm font-semibold text-slate-700">{title}</p>
      {count != null && <p className="mt-1 text-2xl font-bold text-primary">{count}</p>}
    </Link>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [adminCounts, setAdminCounts] = useState<Awaited<ReturnType<typeof adminApi.adminDashboardCounts>> | null>(null);
  const [userCounts, setUserCounts] = useState<Awaited<ReturnType<typeof authApi.dashboardCounts>> | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      if (user.role === 'admin') {
        setAdminCounts(await adminApi.adminDashboardCounts());
      } else {
        const [counts, appts] = await Promise.all([authApi.dashboardCounts(), listAppointments()]);
        setUserCounts(counts);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 1);
        setAppointments(
          appts
            .filter(
              (a) =>
                new Date(a.appointment_date) > cutoff &&
                (a.status === 'approved' || a.status === 'pending')
            )
            .slice(0, 5)
        );
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (!user) return null;
  if (loading) return <Spinner />;
  if (error) return <ErrorMessage error={error} onRetry={load} />;

  const roleLabel = user.role === 'admin' ? 'Admin' : user.role === 'therapist' ? 'Therapist' : 'Parent';

  return (
    <div className="space-y-6">
      <Card className="bg-primary-light/40">
        <h1 className="text-xl font-bold sm:text-2xl">Welcome, {user.fullName}</h1>
        <p className="mt-1 text-sm text-slate-600">{roleLabel}</p>
        <p className="mt-1 text-xs text-slate-500">Use the cards below to navigate.</p>
      </Card>

      {user.role === 'admin' && adminCounts && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold">Admin overview</h2>
          {adminCounts.pendingUsers > 0 && (
            <Link
              to="/users?pending=1"
              className="block rounded-xl border border-amber-300 bg-amber-50 p-5 shadow-sm transition hover:shadow"
            >
              <p className="text-sm font-semibold text-amber-800">⏳ Pending approvals</p>
              <p className="mt-1 text-2xl font-bold text-amber-700">{adminCounts.pendingUsers}</p>
            </Link>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <StatCard title="Children" count={adminCounts.children} icon="🧒" to="/children" />
            <StatCard title="Therapists" count={adminCounts.therapists} icon="🩺" to="/users?role=therapist" />
            <StatCard title="Parents" count={adminCounts.parents} icon="👪" to="/users?role=parent" />
            <StatCard title="All users" count={adminCounts.totalUsers} icon="👥" to="/users" />
            <StatCard
              title="Appointment requests"
              count={adminCounts.pendingAppointments}
              icon="📋"
              to="/admin/appointments"
            />
            <StatCard
              title="Book Appointment"
              count={adminCounts.totalAppointments}
              icon="📅"
              to="/appointments/book"
            />
            <StatCard title="Manage Slots" count={adminCounts.clinicSlots} icon="🕒" to="/admin/slots" />
          </div>
        </div>
      )}

      {user.role !== 'admin' && userCounts && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold">{user.role === 'therapist' ? 'Therapist' : 'My children'}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <StatCard title={user.role === 'parent' ? 'My Children' : 'Children'} count={userCounts.children} icon="🧒" to="/children" />
            {user.role === 'therapist' ? (
              <StatCard title="My Schedule" icon="📅" to="/schedule" />
            ) : (
              <>
                <StatCard title="Book Session" count={userCounts.totalAppointments} icon="➕" to="/appointments/book" />
                <StatCard
                  title="Appointment Requests"
                  count={userCounts.pendingAppointments}
                  icon="📋"
                  to="/parent/schedule"
                />
                <StatCard title="My Schedule" icon="📅" to="/parent/schedule" />
              </>
            )}
          </div>

          <h2 className="text-lg font-bold">Upcoming Appointments</h2>
          {appointments.length === 0 ? (
            <EmptyState>No upcoming appointments</EmptyState>
          ) : (
            <div className="space-y-2">
              {appointments.map((a) => (
                <Card key={a.id} className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">
                      {formatDate(a.appointment_date)} • {formatTime(a.start_time)} – {formatTime(a.end_time)}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Child: {a._child_first_name} {a._child_last_name}
                      {a._therapist_full_name && <> • Therapist: {a._therapist_full_name}</>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={a.status} />
                    {user.role === 'therapist' && a.status === 'approved' && (
                      <button
                        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-dark"
                        onClick={async () => {
                          navigate(
                            `/children/${a.child_id}/sessions/new?appointmentId=${a.id}&date=${a.appointment_date?.slice(0, 10)}`
                          );
                          if (!a.session_id) {
                            // status flips to completed after the session is logged on the form page
                          }
                        }}
                      >
                        {a.session_id ? 'Edit Session' : 'Log Session'}
                      </button>
                    )}
                    {user.role === 'parent' && a.status === 'pending' && (
                      <button
                        className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                        onClick={async () => {
                          try {
                            await updateAppointmentStatus(a.id, 'cancelled');
                            load();
                          } catch {
                            /* parents may not be allowed; ignore */
                          }
                        }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
