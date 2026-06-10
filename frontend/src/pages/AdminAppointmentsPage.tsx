import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  listAppointments,
  approveAppointment,
  updateAppointmentStatus,
  deleteAppointment,
} from '../api/appointments';
import type { Appointment } from '../api/types';
import { errorMessage } from '../api/client';
import {
  Spinner,
  ErrorMessage,
  EmptyState,
  PageTitle,
  inputCls,
  btnPrimary,
  ConfirmDialog,
} from '../components/ui';
import AppointmentCard from '../components/AppointmentCard';

const TABS = ['pending', 'approved', 'completed', 'cancelled', ''] as const;

export default function AdminAppointmentsPage() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [tab, setTab] = useState<string>('pending');
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setAppointments(await listAppointments({ status: tab || undefined, date: date || undefined }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, date]);

  const act = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <div>
      <PageTitle
        actions={
          <button className={btnPrimary} onClick={() => navigate('/appointments/book')}>
            + Book appointment
          </button>
        }
      >
        Appointments
      </PageTitle>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
          {TABS.map((t) => (
            <button
              key={t || 'all'}
              className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition ${
                tab === t ? 'bg-white text-primary shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
              onClick={() => setTab(t)}
            >
              {t || 'All'}
            </button>
          ))}
        </div>
        <input type="date" className={`${inputCls} max-w-44`} value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorMessage error={error} onRetry={load} />
      ) : appointments.length === 0 ? (
        <EmptyState>No {tab || ''} appointments</EmptyState>
      ) : (
        <div className="space-y-2">
          {appointments.map((a) => (
            <AppointmentCard
              key={a.id}
              appointment={a}
              actions={
                <>
                  {a.status === 'pending' && (
                    <button
                      className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
                      onClick={() => act(() => approveAppointment(a.id))}
                    >
                      Approve
                    </button>
                  )}
                  {(a.status === 'pending' || a.status === 'approved') && (
                    <>
                      <button
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        onClick={() => navigate('/appointments/book', { state: { appointment: a } })}
                      >
                        Reschedule
                      </button>
                      <button
                        className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                        onClick={() => act(() => updateAppointmentStatus(a.id, 'cancelled'))}
                      >
                        Cancel
                      </button>
                    </>
                  )}
                  {a.status === 'approved' && (
                    <button
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-dark"
                      onClick={() => act(() => updateAppointmentStatus(a.id, 'completed'))}
                    >
                      Mark completed
                    </button>
                  )}
                  <button
                    className="rounded-lg px-2 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                    onClick={() => setDeleteId(a.id)}
                    title="Delete"
                  >
                    🗑
                  </button>
                </>
              }
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleteId != null}
        title="Delete appointment"
        message="Are you sure you want to delete this appointment?"
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          const id = deleteId!;
          setDeleteId(null);
          act(() => deleteAppointment(id));
        }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
