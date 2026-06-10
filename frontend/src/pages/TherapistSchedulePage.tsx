import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listAppointments, updateAppointmentStatus } from '../api/appointments';
import type { Appointment } from '../api/types';
import { errorMessage } from '../api/client';
import { Spinner, ErrorMessage, EmptyState, PageTitle, inputCls, btnSecondary } from '../components/ui';
import AppointmentCard from '../components/AppointmentCard';

export default function TherapistSchedulePage() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [date, setDate] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setAppointments(
        await listAppointments({ date: date || undefined, status: status || undefined })
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, status]);

  return (
    <div>
      <PageTitle>My Schedule</PageTitle>
      <div className="mb-4 flex flex-wrap gap-3">
        <input type="date" className={`${inputCls} max-w-44`} value={date} onChange={(e) => setDate(e.target.value)} />
        <select className={`${inputCls} max-w-44`} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        {(date || status) && (
          <button
            className={btnSecondary}
            onClick={() => {
              setDate('');
              setStatus('');
            }}
          >
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorMessage error={error} onRetry={load} />
      ) : appointments.length === 0 ? (
        <EmptyState>No appointments found</EmptyState>
      ) : (
        <div className="space-y-2">
          {appointments.map((a) => (
            <AppointmentCard
              key={a.id}
              appointment={a}
              actions={
                a.status === 'approved' ? (
                  <button
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-dark"
                    onClick={() =>
                      navigate(
                        a.session_id
                          ? `/children/${a.child_id}/sessions/${a.session_id}/edit`
                          : `/children/${a.child_id}/sessions/new?appointmentId=${a.id}&date=${String(a.appointment_date).slice(0, 10)}`
                      )
                    }
                  >
                    {a.session_id ? 'Edit Session' : 'Log Session'}
                  </button>
                ) : a.status === 'pending' ? (
                  <button
                    className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                    onClick={async () => {
                      try {
                        await updateAppointmentStatus(a.id, 'cancelled');
                        load();
                      } catch (err) {
                        setError(errorMessage(err));
                      }
                    }}
                  >
                    Cancel
                  </button>
                ) : null
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
