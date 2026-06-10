import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { listAppointments } from '../api/appointments';
import { getChild } from '../api/children';
import type { Appointment, Child } from '../api/types';
import { errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Spinner, ErrorMessage, EmptyState, PageTitle, btnPrimary } from '../components/ui';
import BackButton from '../components/BackButton';
import AppointmentCard from '../components/AppointmentCard';

export default function ChildSchedulePage() {
  const { childId } = useParams<{ childId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [child, setChild] = useState<Child | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    if (!childId) return;
    setLoading(true);
    setError('');
    try {
      const [c, appts] = await Promise.all([getChild(childId), listAppointments({ childId })]);
      setChild(c);
      setAppointments(appts);
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

  const canBook = user?.role === 'admin' || user?.role === 'parent';

  return (
    <div>
      <PageTitle
        back={<BackButton fallback={`/children/${childId}`} />}
        actions={
          canBook && (
            <button
              className={btnPrimary}
              onClick={() => navigate(`/appointments/book?childId=${childId}`)}
            >
              + Book appointment
            </button>
          )
        }
      >
        Appointments{child ? ` — ${child.firstName} ${child.lastName}` : ''}
      </PageTitle>

      {appointments.length === 0 ? (
        <EmptyState>No appointments for this child</EmptyState>
      ) : (
        <div className="space-y-2">
          {appointments.map((a) => (
            <AppointmentCard key={a.id} appointment={a} />
          ))}
        </div>
      )}
    </div>
  );
}
