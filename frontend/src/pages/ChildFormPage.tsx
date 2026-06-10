import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createChild, getChild, updateChild, type ChildInput } from '../api/children';
import { listTherapists } from '../api/auth';
import type { User } from '../api/types';
import { errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Card, Field, inputCls, btnPrimary, btnSecondary, PageTitle, Spinner, ErrorMessage } from '../components/ui';
import BackButton from '../components/BackButton';
import { toDateInput } from '../utils/format';

const GENDERS = ['Male', 'Female', 'Other'];
const AUTISM_LEVELS = ['Level 1', 'Level 2', 'Level 3'];
const THERAPY_STATUSES = ['active', 'paused', 'discharged'];
const COMMUNICATION_TYPES = ['Verbal', 'Non-verbal', 'Minimally verbal', 'AAC device'];

export default function ChildFormPage() {
  const { childId } = useParams<{ childId: string }>();
  const isEdit = Boolean(childId);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [therapists, setTherapists] = useState<User[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    childCode: '',
    gender: '',
    dateOfBirth: '',
    primaryLanguage: '',
    communicationType: '',
    diagnosis: '',
    diagnosisType: '',
    autismLevel: '',
    diagnosisDate: '',
    referredBy: '',
    medicalConditions: '',
    medications: '',
    allergies: '',
    therapyStartDate: '',
    therapyStatus: '',
    sessionsPerWeek: '',
    assignedTherapistIds: [] as string[],
    communicationScore: '',
    socialScore: '',
    behavioralScore: '',
    cognitiveScore: '',
    motorSkillScore: '',
    notes: '',
    behavioralNotes: '',
  });

  const set = (key: keyof typeof form, value: string | string[]) =>
    setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    listTherapists().then(setTherapists).catch(() => {});
    if (!childId) return;
    getChild(childId)
      .then((c) => {
        setForm({
          firstName: c.firstName ?? '',
          lastName: c.lastName ?? '',
          childCode: c.childCode ?? '',
          gender: c.gender ?? '',
          dateOfBirth: toDateInput(c.dateOfBirth),
          primaryLanguage: c.primaryLanguage ?? '',
          communicationType: c.communicationType ?? '',
          diagnosis: c.diagnosis ?? '',
          diagnosisType: c.diagnosisType ?? '',
          autismLevel: c.autismLevel ?? '',
          diagnosisDate: toDateInput(c.diagnosisDate),
          referredBy: c.referredBy ?? '',
          medicalConditions: c.medicalConditions ?? '',
          medications: c.medications ?? '',
          allergies: c.allergies ?? '',
          therapyStartDate: toDateInput(c.therapyStartDate),
          therapyStatus: c.therapyStatus ?? '',
          sessionsPerWeek: c.sessionsPerWeek != null ? String(c.sessionsPerWeek) : '',
          assignedTherapistIds: c.assignedTherapistIds ?? (c.assignedTherapistId ? [c.assignedTherapistId] : []),
          communicationScore: c.communicationScore != null ? String(c.communicationScore) : '',
          socialScore: c.socialScore != null ? String(c.socialScore) : '',
          behavioralScore: c.behavioralScore != null ? String(c.behavioralScore) : '',
          cognitiveScore: c.cognitiveScore != null ? String(c.cognitiveScore) : '',
          motorSkillScore: c.motorSkillScore != null ? String(c.motorSkillScore) : '',
          notes: c.notes ?? '',
          behavioralNotes: c.behavioralNotes ?? '',
        });
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [childId]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    const num = (v: string) => (v.trim() === '' ? undefined : Number(v));
    const str = (v: string) => (v.trim() === '' ? undefined : v.trim());
    const input: ChildInput = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      childCode: str(form.childCode),
      gender: str(form.gender),
      dateOfBirth: str(form.dateOfBirth),
      primaryLanguage: str(form.primaryLanguage),
      communicationType: str(form.communicationType),
      diagnosis: str(form.diagnosis),
      diagnosisType: str(form.diagnosisType),
      autismLevel: str(form.autismLevel),
      diagnosisDate: str(form.diagnosisDate),
      referredBy: str(form.referredBy),
      medicalConditions: str(form.medicalConditions),
      medications: str(form.medications),
      allergies: str(form.allergies),
      therapyStartDate: str(form.therapyStartDate),
      therapyStatus: str(form.therapyStatus),
      sessionsPerWeek: num(form.sessionsPerWeek),
      communicationScore: num(form.communicationScore),
      socialScore: num(form.socialScore),
      behavioralScore: num(form.behavioralScore),
      cognitiveScore: num(form.cognitiveScore),
      motorSkillScore: num(form.motorSkillScore),
      notes: str(form.notes),
      behavioralNotes: str(form.behavioralNotes),
    };
    try {
      if (isEdit && childId) {
        await updateChild(childId, { ...input, assignedTherapistIds: form.assignedTherapistIds });
        navigate(`/children/${childId}`);
      } else {
        const created = await createChild({
          ...input,
          assignedTherapistId: form.assignedTherapistIds[0],
        });
        if (form.assignedTherapistIds.length > 1) {
          await updateChild(created.id, { assignedTherapistIds: form.assignedTherapistIds });
        }
        navigate(`/children/${created.id}`);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Spinner />;

  const scoreFields: Array<[string, keyof typeof form]> = [
    ['Communication', 'communicationScore'],
    ['Social', 'socialScore'],
    ['Behavioral', 'behavioralScore'],
    ['Cognitive', 'cognitiveScore'],
    ['Motor skills', 'motorSkillScore'],
  ];

  return (
    <div>
      <PageTitle back={<BackButton fallback={isEdit ? `/children/${childId}` : '/children'} />}>
        {isEdit ? 'Edit child' : 'Add child'}
      </PageTitle>
      {error && <div className="mb-4"><ErrorMessage error={error} /></div>}
      <form onSubmit={submit} className="space-y-4">
        <Card>
          <h2 className="mb-3 font-bold">Basic information</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name" required>
              <input className={inputCls} value={form.firstName} onChange={(e) => set('firstName', e.target.value)} required />
            </Field>
            <Field label="Last name" required>
              <input className={inputCls} value={form.lastName} onChange={(e) => set('lastName', e.target.value)} required />
            </Field>
            <Field label="Child code">
              <input className={inputCls} value={form.childCode} onChange={(e) => set('childCode', e.target.value)} />
            </Field>
            <Field label="Gender">
              <select className={inputCls} value={form.gender} onChange={(e) => set('gender', e.target.value)}>
                <option value="">—</option>
                {GENDERS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </Field>
            <Field label="Date of birth">
              <input type="date" className={inputCls} value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} />
            </Field>
            <Field label="Primary language">
              <input className={inputCls} value={form.primaryLanguage} onChange={(e) => set('primaryLanguage', e.target.value)} />
            </Field>
            <Field label="Communication type">
              <select className={inputCls} value={form.communicationType} onChange={(e) => set('communicationType', e.target.value)}>
                <option value="">—</option>
                {COMMUNICATION_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Referred by">
              <input className={inputCls} value={form.referredBy} onChange={(e) => set('referredBy', e.target.value)} />
            </Field>
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 font-bold">Diagnosis</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Diagnosis">
              <input className={inputCls} value={form.diagnosis} onChange={(e) => set('diagnosis', e.target.value)} />
            </Field>
            <Field label="Diagnosis type">
              <input className={inputCls} value={form.diagnosisType} onChange={(e) => set('diagnosisType', e.target.value)} />
            </Field>
            <Field label="Autism level">
              <select className={inputCls} value={form.autismLevel} onChange={(e) => set('autismLevel', e.target.value)}>
                <option value="">—</option>
                {AUTISM_LEVELS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </Field>
            <Field label="Diagnosis date">
              <input type="date" className={inputCls} value={form.diagnosisDate} onChange={(e) => set('diagnosisDate', e.target.value)} />
            </Field>
            <Field label="Medical conditions">
              <input className={inputCls} value={form.medicalConditions} onChange={(e) => set('medicalConditions', e.target.value)} />
            </Field>
            <Field label="Medications">
              <input className={inputCls} value={form.medications} onChange={(e) => set('medications', e.target.value)} />
            </Field>
            <Field label="Allergies">
              <input className={inputCls} value={form.allergies} onChange={(e) => set('allergies', e.target.value)} />
            </Field>
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 font-bold">Therapy</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Therapy start date">
              <input type="date" className={inputCls} value={form.therapyStartDate} onChange={(e) => set('therapyStartDate', e.target.value)} />
            </Field>
            <Field label="Therapy status">
              <select className={inputCls} value={form.therapyStatus} onChange={(e) => set('therapyStatus', e.target.value)}>
                <option value="">—</option>
                {THERAPY_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Sessions per week">
              <input
                type="number"
                min={0}
                max={14}
                className={inputCls}
                value={form.sessionsPerWeek}
                onChange={(e) => set('sessionsPerWeek', e.target.value)}
              />
            </Field>
            {user?.role === 'admin' && (
              <Field label="Assigned therapists">
                <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-slate-300 p-2">
                  {therapists.length === 0 && <p className="text-xs text-slate-500">No therapists found</p>}
                  {therapists.map((t) => (
                    <label key={t.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.assignedTherapistIds.includes(t.id)}
                        onChange={(e) =>
                          set(
                            'assignedTherapistIds',
                            e.target.checked
                              ? [...form.assignedTherapistIds, t.id]
                              : form.assignedTherapistIds.filter((id) => id !== t.id)
                          )
                        }
                      />
                      {t.fullName}
                      {t.title ? ` (${t.title})` : ''}
                    </label>
                  ))}
                </div>
              </Field>
            )}
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 font-bold">Skill scores (0–10)</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {scoreFields.map(([label, key]) => (
              <Field key={key} label={label}>
                <input
                  type="number"
                  min={0}
                  max={10}
                  className={inputCls}
                  value={form[key] as string}
                  onChange={(e) => set(key, e.target.value)}
                />
              </Field>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 font-bold">Notes</h2>
          <div className="space-y-4">
            <Field label="General notes">
              <textarea
                className={`${inputCls} min-h-24`}
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
              />
            </Field>
            <Field label="Behavioral notes">
              <textarea
                className={`${inputCls} min-h-24`}
                value={form.behavioralNotes}
                onChange={(e) => set('behavioralNotes', e.target.value)}
              />
            </Field>
          </div>
        </Card>

        <div className="flex gap-2">
          <button type="submit" className={btnPrimary} disabled={busy}>
            {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Add child'}
          </button>
          <button type="button" className={btnSecondary} onClick={() => navigate(-1)}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
