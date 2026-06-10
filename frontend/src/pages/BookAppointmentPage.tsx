import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  createAppointment,
  updateAppointment,
  getBookedSlots,
  listClinicSlots,
} from '../api/appointments';
import { listChildren } from '../api/children';
import { listTherapists } from '../api/auth';
import type { Appointment, Child, ClinicSlot, User } from '../api/types';
import { errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Card, Field, inputCls, btnPrimary, PageTitle, ErrorMessage, Spinner } from '../components/ui';
import BackButton from '../components/BackButton';
import { formatTime, todayInput } from '../utils/format';

export default function BookAppointmentPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const editing = (location.state as { appointment?: Appointment } | null)?.appointment ?? null;

  const [children, setChildren] = useState<Child[]>([]);
  const [therapists, setTherapists] = useState<User[]>([]);
  const [childId, setChildId] = useState(editing?.child_id ?? searchParams.get('childId') ?? '');
  const [therapistId, setTherapistId] = useState(editing?.therapist_id ?? '');
  const [date, setDate] = useState(editing?.appointment_date?.slice(0, 10) ?? todayInput());
  const [slots, setSlots] = useState<ClinicSlot[]>([]);
  const [booked, setBooked] = useState<Appointment[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<ClinicSlot | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listChildren().then(({ children: rows }) => setChildren(rows)).catch(() => {});
    listTherapists().then(setTherapists).catch(() => {});
  }, []);

  useEffect(() => {
    setSelectedSlot(null);
    setLoadingSlots(true);
    const dayOfWeek = new Date(date + 'T00:00:00').getDay();
    const tasks: [Promise<ClinicSlot[]>, Promise<Appointment[]>] = [
      listClinicSlots(dayOfWeek),
      therapistId ? getBookedSlots(therapistId, date) : Promise.resolve([]),
    ];
    Promise.all(tasks)
      .then(([clinicSlots, bookedSlots]) => {
        setSlots(clinicSlots.filter((s) => s.is_active && s.slot_type !== 'blocked'));
        setBooked(bookedSlots);
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoadingSlots(false));
  }, [date, therapistId]);

  const isBooked = (slot: ClinicSlot) =>
    booked.some((b) => {
      if (b.appointment_date && !String(b.appointment_date).includes(date)) return false;
      if (editing && b.id === editing.id) return false;
      return String(b.start_time).slice(0, 5) === slot.start_time.slice(0, 5);
    });

  const submit = async () => {
    setError('');
    if (!childId || !therapistId || !selectedSlot) {
      setError('Please select a child, therapist, date and time slot');
      return;
    }
    setBusy(true);
    try {
      if (editing) {
        await updateAppointment(editing.id, {
          appointmentDate: date,
          startTime: selectedSlot.start_time,
          endTime: selectedSlot.end_time,
          therapistId,
        });
        setSuccess('Appointment updated.');
      } else {
        await createAppointment({
          childId,
          therapistId,
          appointmentDate: date,
          startTime: selectedSlot.start_time,
          endTime: selectedSlot.end_time,
        });
        setSuccess(
          user?.role === 'admin'
            ? 'Appointment booked and approved.'
            : 'Appointment requested. An admin will review and approve it.'
        );
      }
      setTimeout(() => {
        navigate(user?.role === 'admin' ? '/admin/appointments' : user?.role === 'therapist' ? '/schedule' : '/parent/schedule');
      }, 900);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const title = editing
    ? user?.role === 'admin'
      ? 'Reschedule (Admin)'
      : 'Request Reschedule'
    : user?.role === 'admin'
      ? 'Book Appointment (Admin)'
      : 'Book Appointment';

  return (
    <div className="space-y-4">
      <PageTitle back={<BackButton />}>{title}</PageTitle>
      {error && <ErrorMessage error={error} />}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{success}</div>
      )}

      <Card>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Child" required>
            <select className={inputCls} value={childId} onChange={(e) => setChildId(e.target.value)}>
              <option value="">Select child…</option>
              {children.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Therapist" required>
            <select className={inputCls} value={therapistId} onChange={(e) => setTherapistId(e.target.value)}>
              <option value="">Select therapist…</option>
              {therapists.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.fullName}
                  {t.title ? ` (${t.title})` : ''}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date" required>
            <input
              type="date"
              className={inputCls}
              value={date}
              min={todayInput()}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 font-bold">Available time slots</h2>
        {!therapistId ? (
          <p className="text-sm text-slate-500">Select a therapist to see availability</p>
        ) : loadingSlots ? (
          <Spinner />
        ) : slots.length === 0 ? (
          <p className="text-sm text-slate-500">No clinic slots configured for this day</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {slots.map((s) => {
              const taken = isBooked(s);
              const selected = selectedSlot?.id === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={taken}
                  onClick={() => setSelectedSlot(s)}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                    taken
                      ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-300 line-through'
                      : selected
                        ? 'border-primary bg-primary text-white'
                        : 'border-slate-300 bg-white text-slate-700 hover:border-primary'
                  }`}
                >
                  <span className="block">{s.label}</span>
                  <span className="block text-xs opacity-80">
                    {formatTime(s.start_time)} – {formatTime(s.end_time)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      <button className={btnPrimary} onClick={submit} disabled={busy || !selectedSlot}>
        {busy ? 'Submitting…' : editing ? 'Save changes' : 'Book appointment'}
      </button>
    </div>
  );
}
