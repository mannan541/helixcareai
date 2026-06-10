import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { createSession, getSession, updateSession } from '../api/sessions';
import { listAppointments, updateAppointmentStatus } from '../api/appointments';
import { getChild } from '../api/children';
import { listTherapists } from '../api/auth';
import type { Child, User } from '../api/types';
import { errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Card, Field, inputCls, btnPrimary, btnSecondary, PageTitle, Spinner, ErrorMessage } from '../components/ui';
import BackButton from '../components/BackButton';
import { formatTime, todayInput, toDateInput, sessionMetricLabel } from '../utils/format';

const THERAPY_TITLES = ['Speech', 'Behaviour', 'Occupational'] as const;

const DEFAULT_METRICS = [
  { key: 'engagement', label: 'Engagement' },
  { key: 'focus', label: 'Focus' },
  { key: 'communication', label: 'Communication' },
] as const;

const DEFAULT_TIME_SLOT = '12:15 PM - 01:00 PM';

const LAST_THERAPIST_KEY = 'helixcareai_last_session_therapist';

function therapyFromTherapistTitle(title?: string | null): string | null {
  if (!title) return null;
  for (const t of THERAPY_TITLES) {
    if (title.includes(t)) return t;
  }
  return null;
}

function getAssignedTherapistIds(child: Child): string[] {
  if (child.assignedTherapistIds?.length) return child.assignedTherapistIds;
  if (child.assignedTherapistId) return [child.assignedTherapistId];
  return [];
}

/** Match Flutter: prefer child's assigned therapists; otherwise any therapist with that therapy title. */
function pickTherapistForTherapy(
  therapy: string,
  assignedTherapists: User[],
  allTherapists: User[]
): User | null {
  const pool = assignedTherapists.length > 0 ? assignedTherapists : allTherapists;
  return pool.find((th) => therapyFromTherapistTitle(th.title) === therapy) ?? null;
}

function formatAppointmentTimeSlot(startTime: string, endTime: string): string {
  return `${formatTime(startTime)} - ${formatTime(endTime)}`;
}

type MetricValues = Record<string, string>;

export default function SessionFormPage() {
  const { childId, sessionId } = useParams<{ childId: string; sessionId?: string }>();
  const [searchParams] = useSearchParams();
  const appointmentId = searchParams.get('appointmentId');
  const presetDate = searchParams.get('date');
  const isEdit = Boolean(sessionId);
  const navigate = useNavigate();
  const { user } = useAuth();
  const notesRef = useRef<HTMLTextAreaElement>(null);

  const [child, setChild] = useState<Child | null>(null);
  const [therapists, setTherapists] = useState<User[]>([]);
  const [assignedTherapists, setAssignedTherapists] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [date, setDate] = useState(presetDate ?? todayInput());
  const [duration, setDuration] = useState('45');
  const [therapyTitle, setTherapyTitle] = useState<string | null>(null);
  const [timeSlot, setTimeSlot] = useState(DEFAULT_TIME_SLOT);
  const [therapistId, setTherapistId] = useState('');
  const [notes, setNotes] = useState('');
  const [metricValues, setMetricValues] = useState<MetricValues>({
    engagement: '5',
    focus: '5',
    communication: '5',
  });

  useEffect(() => {
    if (!childId) return;
    (async () => {
      try {
        const [c, ths] = await Promise.all([getChild(childId), listTherapists().catch(() => [] as User[])]);
        setChild(c);
        setTherapists(ths);

        const assignedIds = getAssignedTherapistIds(c);
        const assigned = ths.filter((t) => assignedIds.includes(t.id));
        setAssignedTherapists(assigned);

        if (sessionId) {
          const s = await getSession(sessionId);
          setDate(toDateInput(s.sessionDate) || todayInput());
          setDuration(s.durationMinutes != null ? String(s.durationMinutes) : '45');
          setNotes(s.notesText ?? '');
          setTherapistId(s.therapistId ?? '');
          const m = s.structuredMetrics ?? {};
          setTherapyTitle(
            (m.therapyTitle as string) ?? therapyFromTherapistTitle(s.therapistUser?.title) ?? null
          );
          setTimeSlot((m.timeSlot as string) ?? DEFAULT_TIME_SLOT);
          setMetricValues({
            engagement: String(m.engagement ?? '5'),
            focus: String(m.focus ?? '5'),
            communication: String(m.communication ?? '5'),
          });
        } else {
          // New session defaults
          let initialTherapistId = '';
          let initialTherapy: string | null = null;
          let initialTimeSlot = DEFAULT_TIME_SLOT;

          if (appointmentId) {
            const appts = await listAppointments({ childId }).catch(() => []);
            const appt = appts.find((a) => a.id === appointmentId);
            if (appt) {
              initialTimeSlot = formatAppointmentTimeSlot(appt.start_time, appt.end_time);
              if (appt.therapist_id) {
                initialTherapistId = appt.therapist_id;
                const th = ths.find((t) => t.id === appt.therapist_id);
                initialTherapy = therapyFromTherapistTitle(th?.title);
              }
            }
          } else if (user?.role === 'therapist') {
            initialTherapistId = user.id;
            initialTherapy = therapyFromTherapistTitle(user.title);
          } else {
            const saved = sessionStorage.getItem(LAST_THERAPIST_KEY);
            if (saved) {
              try {
                const parsed = JSON.parse(saved) as { id: string; title?: string | null };
                if (ths.some((t) => t.id === parsed.id)) {
                  initialTherapistId = parsed.id;
                  initialTherapy = therapyFromTherapistTitle(parsed.title);
                }
              } catch {
                /* ignore */
              }
            }
          }

          setTimeSlot(initialTimeSlot);
          setTherapistId(initialTherapistId);
          setTherapyTitle(initialTherapy);
        }
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId, sessionId]);

  const selectTherapy = (therapy: string) => {
    const next = therapyTitle === therapy ? null : therapy;
    setTherapyTitle(next);
    if (next) {
      const match = pickTherapistForTherapy(next, assignedTherapists, therapists);
      if (match) setTherapistId(match.id);
    }
  };

  const selectTherapist = (id: string) => {
    setTherapistId(id);
    const th = therapists.find((t) => t.id === id);
    if (th) {
      const fromTitle = therapyFromTherapistTitle(th.title);
      if (fromTitle) setTherapyTitle(fromTitle);
      sessionStorage.setItem(
        LAST_THERAPIST_KEY,
        JSON.stringify({ id: th.id, title: th.title ?? null })
      );
    } else {
      setTherapistId('');
    }
  };

  const insertBullet = () => {
    const el = notesRef.current;
    if (!el) return;
    const start = el.selectionStart ?? notes.length;
    const end = el.selectionEnd ?? notes.length;
    const bullet = '• ';
    const newText = notes.slice(0, start) + bullet + notes.slice(end);
    setNotes(newText);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + bullet.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    const structuredMetrics: Record<string, unknown> = {};
    if (therapyTitle) structuredMetrics.therapyTitle = therapyTitle;
    if (timeSlot.trim()) structuredMetrics.timeSlot = timeSlot.trim();
    for (const { key } of DEFAULT_METRICS) {
      const v = metricValues[key]?.trim();
      if (v) {
        const n = Number(v);
        structuredMetrics[key] = isNaN(n) ? v : n;
      }
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
        {child && (
          <Card>
            <p className="text-sm font-bold text-slate-700">Child</p>
            <p className="mt-1 text-lg font-bold text-primary">
              {child.firstName} {child.lastName}
            </p>
          </Card>
        )}

        <Card className="space-y-4">
          <Field label="Therapist">
            <div className="flex gap-2">
              <select
                className={`${inputCls} flex-1`}
                value={therapistId}
                onChange={(e) => selectTherapist(e.target.value)}
              >
                <option value="">Select therapist (optional)</option>
                {therapists.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.fullName} ({t.email})
                    {t.title ? ` — ${t.title}` : ''}
                  </option>
                ))}
              </select>
              {therapistId && (
                <button
                  type="button"
                  className={btnSecondary}
                  onClick={() => selectTherapist('')}
                  title="Clear therapist"
                >
                  Clear
                </button>
              )}
            </div>
            {selectedTherapist?.title && (
              <p className="mt-1 text-xs text-slate-500">{selectedTherapist.title}</p>
            )}
            {assignedTherapists.length > 0 && (
              <p className="mt-1 text-xs text-slate-500">
                Assigned to this child: {assignedTherapists.map((t) => t.fullName).join(', ')}
              </p>
            )}
          </Field>

          <Field label="Therapy title">
            <div className="flex flex-wrap gap-2 pt-1">
              {THERAPY_TITLES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => selectTherapy(t)}
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

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Session date" required>
              <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} required />
            </Field>
            <Field label="Time slot (optional)">
              <input
                className={inputCls}
                placeholder="e.g. 9:00 AM - 10:00 AM"
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
              />
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
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 font-bold">Structured metrics</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {DEFAULT_METRICS.map(({ key, label }) => (
              <Field key={key} label={label}>
                <input
                  type="number"
                  min={1}
                  max={10}
                  className={inputCls}
                  placeholder="1-10 or value"
                  value={metricValues[key] ?? ''}
                  onChange={(e) =>
                    setMetricValues((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                />
              </Field>
            ))}
          </div>
          {/* Show any extra metrics from edit mode not in defaults */}
          {isEdit &&
            Object.entries(metricValues)
              .filter(([k]) => !DEFAULT_METRICS.some((m) => m.key === k))
              .map(([key, value]) => (
                <div key={key} className="mt-3">
                  <Field label={sessionMetricLabel(key)}>
                    <input
                      className={inputCls}
                      value={value}
                      onChange={(e) =>
                        setMetricValues((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                    />
                  </Field>
                </div>
              ))}
        </Card>

        <Card>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-bold text-slate-900">Therapist notes (free text)</span>
            <button
              type="button"
              onClick={insertBullet}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              title="Add bullet point"
              aria-label="Add bullet point"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z" />
              </svg>
            </button>
          </div>
          <textarea
            ref={notesRef}
            className={`${inputCls} min-h-32`}
            placeholder="Therapist notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
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
