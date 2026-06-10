import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listAppointments } from '../api/appointments';
import type { Appointment } from '../api/types';
import { errorMessage } from '../api/client';
import { Spinner, ErrorMessage, EmptyState, PageTitle, btnPrimary } from '../components/ui';
import AppointmentCard from '../components/AppointmentCard';

export default function ParentSchedulePage() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setAppointments(await listAppointments());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const upcoming = appointments.filter((a) => a.status === 'pending' || a.status === 'approved');
  const past = appointments.filter((a) => a.status === 'completed' || a.status === 'cancelled');

  return (
    <div>
      <PageTitle
        actions={
          <button className={btnPrimary} onClick={() => navigate('/appointments/book')}>
            + Book appointment
          </button>
        }
      >
        My Schedule
      </PageTitle>

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorMessage error={error} onRetry={load} />
      ) : appointments.length === 0 ? (
        <EmptyState>No appointments yet. Book one to get started.</EmptyState>
      ) : (
        <div className="space-y-5">
          <div>
            <h2 className="mb-2 text-lg font-bold">Upcoming & pending</h2>
            {upcoming.length === 0 ? (
              <EmptyState>No upcoming appointments</EmptyState>
            ) : (
              <div className="space-y-2">
                {upcoming.map((a) => (
                  <AppointmentCard
                    key={a.id}
                    appointment={a}
                    actions={
                      <button
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        onClick={() => navigate('/appointments/book', { state: { appointment: a } })}
                      >
                        Reschedule
                      </button>
                    }
                  />
                ))}
              </div>
            )}
          </div>
          <div>
            <h2 className="mb-2 text-lg font-bold">History</h2>
            {past.length === 0 ? (
              <EmptyState>No past appointments</EmptyState>
            ) : (
              <div className="space-y-2">
                {past.map((a) => (
                  <AppointmentCard key={a.id} appointment={a} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
