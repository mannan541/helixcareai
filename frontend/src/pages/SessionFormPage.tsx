import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { createSession, getSession, updateSession } from '../api/sessions';
import { updateAppointmentStatus } from '../api/appointments';
import { getChild } from '../api/children';
import { listTherapists } from '../api/auth';
import type { Child, User } from '../api/types';
import { errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Card, Field, inputCls, btnPrimary, btnSecondary, PageTitle, Spinner, ErrorMessage } from '../components/ui';
import BackButton from '../components/BackButton';
import { todayInput, toDateInput } from '../utils/format';

const THERAPY_TITLES = ['Speech', 'Behaviour', 'Occupational'];

function therapyFromTherapistTitle(title?: string | null): string | null {
  if (!title) return null;
  for (const t of THERAPY_TITLES) {
    if (title.includes(t)) return t;
  }
  return null;
}

type MetricEntry = { key: string; value: string };

export default function SessionFormPage() {
  const { childId, sessionId } = useParams<{ childId: string; sessionId?: string }>();
  const [searchParams] = useSearchParams();
  const appointmentId = searchParams.get('appointmentId');
  const presetDate = searchParams.get('date');
  const isEdit = Boolean(sessionId);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [child, setChild] = useState<Child | null>(null);
  const [therapists, setTherapists] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [date, setDate] = useState(presetDate ?? todayInput());
  const [duration, setDuration] = useState('45');
  const [therapyTitle, setTherapyTitle] = useState<string | null>(null);
  const [timeSlot, setTimeSlot] = useState('');
  const [therapistId, setTherapistId] = useState('');
  const [notes, setNotes] = useState('');
  const [metrics, setMetrics] = useState<MetricEntry[]>([
    { key: 'engagement', value: '5' },
    { key: 'focus', value: '5' },
    { key: 'communication', value: '5' },
  ]);

  useEffect(() => {
    if (!childId) return;
    (async () => {
      try {
        const [c, ths] = await Promise.all([getChild(childId), listTherapists().catch(() => [] as User[])]);
        setChild(c);
        setTherapists(ths);
        if (sessionId) {
          const s = await getSession(sessionId);
          setDate(toDateInput(s.sessionDate) || todayInput());
          setDuration(s.durationMinutes != null ? String(s.durationMinutes) : '');
          setNotes(s.notesText ?? '');
          setTherapistId(s.therapistId ?? '');
          const m = s.structuredMetrics ?? {};
          setTherapyTitle(
            (m.therapyTitle as string) ?? therapyFromTherapistTitle(s.therapistUser?.title) ?? null
          );
          setTimeSlot((m.timeSlot as string) ?? '');
          const entries = Object.entries(m)
            .filter(([k]) => k !== 'therapyTitle' && k !== 'timeSlot')
            .map(([key, value]) => ({ key, value: String(value ?? '') }));
          if (entries.length > 0) setMetrics(entries);
        } else if (user?.role === 'therapist') {
          setTherapistId(user.id);
          setTherapyTitle(therapyFromTherapistTitle(user.title));
        }
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId, sessionId]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    const structuredMetrics: Record<string, unknown> = {};
    if (therapyTitle) structuredMetrics.therapyTitle = therapyTitle;
    if (timeSlot.trim()) structuredMetrics.timeSlot = timeSlot.trim();
    for (const m of metrics) {
      const k = m.key.trim();
      const v = m.value.trim();
      if (!k || !v) continue;
      const n = Number(v);
      structuredMetrics[k] = isNaN(n) ? v : n;
    }
    try {
      if (isEdit && sessionId) {
        await updateSession(sessionId, {
          sessionDate: date,
          therapistId: therapistId || null,
          durationMinutes: duration.trim() ? Number(duration) : undefined,
          notesText: notes.trim() || undefined,
          structuredMetrics,
        });
        navigate(`/children/${childId}/sessions/${sessionId}`);
      } else if (childId) {
        await createSession({
          childId,
          sessionDate: date,
          therapistId: therapistId || null,
          durationMinutes: duration.trim() ? Number(duration) : undefined,
          notesText: notes.trim() || undefined,
          structuredMetrics,
          appointmentId: appointmentId || null,
        });
        if (appointmentId) {
          await updateAppointmentStatus(appointmentId, 'completed').catch(() => {});
        }
        navigate(`/children/${childId}/sessions`);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Spinner />;

  const selectedTherapist = therapists.find((t) => t.id === therapistId);

  return (
    <div>
      <PageTitle back={<BackButton fallback={`/children/${childId}/sessions`} />}>
        {isEdit ? 'Edit session' : 'Log session'}
        {child ? ` — ${child.firstName} ${child.lastName}` : ''}
      </PageTitle>
      {error && <div className="mb-4"><ErrorMessage error={error} /></div>}
      <form onSubmit={submit} className="space-y-4">
        <Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Session date" required>
              <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} required />
            </Field>
            <Field label="Duration (minutes)">
              <input
                type="number"
                min={0}
                className={inputCls}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </Field>
            <Field label="Therapy">
              <div className="flex flex-wrap gap-2 pt-1">
                {THERAPY_TITLES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      const next = therapyTitle === t ? null : t;
                      setTherapyTitle(next);
                      if (next) {
                        const match = therapists.find((th) => therapyFromTherapistTitle(th.title) === next);
                        if (match) setTherapistId(match.id);
                      }
                    }}
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                      therapyTitle === t
                        ? 'border-primary bg-primary text-white'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Time slot (optional)">
              <input
                className={inputCls}
                placeholder="e.g. 9:00 AM - 10:00 AM"
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
              />
            </Field>
            <Field label="Therapist">
              <select
                className={inputCls}
                value={therapistId}
                onChange={(e) => {
                  setTherapistId(e.target.value);
                  const t = therapists.find((x) => x.id === e.target.value);
                  const fromTitle = therapyFromTherapistTitle(t?.title);
                  if (fromTitle) setTherapyTitle(fromTitle);
                }}
              >
                <option value="">— None —</option>
                {therapists.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.fullName}
                    {t.title ? ` (${t.title})` : ''}
                  </option>
                ))}
              </select>
              {selectedTherapist?.title && (
                <p className="mt-1 text-xs text-slate-500">{selectedTherapist.title}</p>
              )}
            </Field>
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 font-bold">Session metrics</h2>
          <div className="space-y-2">
            {metrics.map((m, i) => (
              <div key={i} className="flex gap-2">
                <input
                  className={`${inputCls} flex-1`}
                  placeholder="Metric name"
                  value={m.key}
                  onChange={(e) =>
                    setMetrics((prev) => prev.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))
                  }
                />
                <input
                  className={`${inputCls} w-32`}
                  placeholder="Value"
                  value={m.value}
                  onChange={(e) =>
                    setMetrics((prev) => prev.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))
                  }
                />
                <button
                  type="button"
                  className="rounded-lg px-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  onClick={() => setMetrics((prev) => prev.filter((_, j) => j !== i))}
                  aria-label="Remove metric"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="mt-3 text-sm font-semibold text-primary hover:underline"
            onClick={() => setMetrics((prev) => [...prev, { key: '', value: '' }])}
          >
            + Add metric
          </button>
        </Card>

        <Card>
          <Field label="Therapist notes">
            <textarea
              className={`${inputCls} min-h-32`}
              placeholder="What happened in this session? Activities, behaviour, progress…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
        </Card>

        <div className="flex gap-2">
          <button type="submit" className={btnPrimary} disabled={busy}>
            {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Log session'}
          </button>
          <button type="button" className={btnSecondary} onClick={() => navigate(-1)}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
