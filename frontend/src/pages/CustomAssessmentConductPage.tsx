import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { createAssessment, getCustomTemplate, type CustomAssessmentTemplate, type CustomQuestion } from '../api/assessments';
import { listChildren } from '../api/children';
import type { Child } from '../api/types';
import { errorMessage } from '../api/client';
import { Card, Field, Spinner, ErrorMessage, PageTitle, btnPrimary, btnSecondary, inputCls } from '../components/ui';
import BackButton from '../components/BackButton';
import { todayInput } from '../utils/format';

type ResponseValue = string | string[];

function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: CustomQuestion;
  value: ResponseValue | undefined;
  onChange: (v: ResponseValue) => void;
}) {
  if (question.type === 'single_choice') {
    return (
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={question.text}>
        {(question.options ?? []).map((opt) => (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={value === opt}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onChange(opt)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
              value === opt ? 'border-primary bg-primary text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    );
  }
  if (question.type === 'multiple_choice') {
    const selected = Array.isArray(value) ? value : [];
    return (
      <div className="flex flex-wrap gap-2">
        {(question.options ?? []).map((opt) => {
          const checked = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              aria-pressed={checked}
              onClick={() => onChange(checked ? selected.filter((v) => v !== opt) : [...selected, opt])}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                checked ? 'border-primary bg-primary text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
              }`}
            >
              {checked ? '✓ ' : ''}
              {opt}
            </button>
          );
        })}
      </div>
    );
  }
  if (question.type === 'scale') {
    const max = question.scaleMax ?? 5;
    const nums = Array.from({ length: max }, (_, i) => i + 1);
    return (
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={question.text}>
        {nums.map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === String(n)}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onChange(String(n))}
            className={`h-9 w-9 rounded-full border text-sm font-semibold transition ${
              value === String(n) ? 'border-primary bg-primary text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    );
  }
  return (
    <textarea
      className={`${inputCls} min-h-20`}
      value={typeof value === 'string' ? value : ''}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export default function CustomAssessmentConductPage() {
  const { templateId } = useParams<{ templateId: string }>();
  const [searchParams] = useSearchParams();
  const presetChildId = searchParams.get('childId');
  const navigate = useNavigate();

  const [template, setTemplate] = useState<CustomAssessmentTemplate | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [childId, setChildId] = useState(presetChildId ?? '');
  const [assessedAt, setAssessedAt] = useState(todayInput());
  const [respondent, setRespondent] = useState('Parent');
  const [responses, setResponses] = useState<Record<string, ResponseValue>>({});
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!templateId) return;
    (async () => {
      try {
        const [t, { children: kids }] = await Promise.all([getCustomTemplate(templateId), listChildren()]);
        setTemplate(t);
        setChildren(kids);
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [templateId]);

  const setAnswer = (qid: string, val: ResponseValue) => setResponses((prev) => ({ ...prev, [qid]: val }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!templateId || !childId || !template) return;
    const missing = template.questions.filter((q) => {
      const v = responses[q.id];
      return v == null || v === '' || (Array.isArray(v) && v.length === 0);
    });
    if (missing.length > 0) {
      setError(`Please answer all ${template.questions.length} questions (${missing.length} remaining).`);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const saved = await createAssessment({
        childId,
        assessmentType: 'custom',
        customTemplateId: templateId,
        assessedAt,
        respondent,
        responses,
        notes: notes.trim() || undefined,
      });
      navigate(`/admin/assessments/${saved.id}/report`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Spinner />;
  if (error && !template) return <ErrorMessage error={error} />;
  if (!template || !templateId) return null;

  return (
    <div className="space-y-4">
      <PageTitle back={<BackButton fallback="/admin/assessments" />}>{template.name}</PageTitle>
      {template.description && <p className="text-sm text-slate-600">{template.description}</p>}

      {error && <ErrorMessage error={error} />}

      <form onSubmit={submit} className="space-y-4">
        <Card>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Child" required>
              <select className={inputCls} value={childId} onChange={(e) => setChildId(e.target.value)} required>
                <option value="">Select child…</option>
                {children.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName}
                    {c.childCode ? ` (${c.childCode})` : ''}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Date" required>
              <input type="date" className={inputCls} value={assessedAt} onChange={(e) => setAssessedAt(e.target.value)} required />
            </Field>
            <Field label="Respondent">
              <input className={inputCls} value={respondent} onChange={(e) => setRespondent(e.target.value)} />
            </Field>
          </div>
        </Card>

        <Card>
          <ol className="space-y-5">
            {template.questions.map((q, i) => (
              <li key={q.id} className="border-b border-slate-100 pb-5 last:border-0">
                <p className="mb-2 text-sm text-slate-800">
                  {i + 1}. {q.text}
                </p>
                <QuestionInput question={q} value={responses[q.id]} onChange={(v) => setAnswer(q.id, v)} />
              </li>
            ))}
          </ol>
        </Card>

        <Card>
          <Field label="Notes (optional)">
            <textarea className={`${inputCls} min-h-20`} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </Card>

        <div className="flex gap-2">
          <button type="submit" className={btnPrimary} disabled={busy}>
            {busy ? 'Saving…' : 'Save & generate report'}
          </button>
          <button type="button" className={btnSecondary} onClick={() => navigate('/admin/assessments')}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
