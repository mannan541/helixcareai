import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { createAssessment, getAssessmentTemplate, type AssessmentTemplate } from '../api/assessments';
import { listChildren } from '../api/children';
import type { Child } from '../api/types';
import { errorMessage } from '../api/client';
import { Card, Field, Spinner, ErrorMessage, PageTitle, btnPrimary, btnSecondary, inputCls } from '../components/ui';
import BackButton from '../components/BackButton';
import { todayInput } from '../utils/format';

function isPerformanceQuestion(template: AssessmentTemplate, questionId: string): boolean {
  return template.id === 'vanderbilt' && questionId.startsWith('perf_');
}

const choiceBtn =
  'rounded-lg border px-2 py-1 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';
const choiceSelected = 'border-primary bg-primary text-white';
const choiceIdle = 'border-slate-200 bg-white text-slate-700 hover:border-slate-300';

function ChoiceGroup({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { v: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  ariaLabel: string;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          role="radio"
          aria-checked={value === o.v}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onChange(o.v)}
          className={`${choiceBtn} ${value === o.v ? choiceSelected : choiceIdle}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Likert03({ value, onChange, questionId }: { value: string; onChange: (v: string) => void; questionId: string }) {
  return (
    <ChoiceGroup
      ariaLabel={`Response for question ${questionId}`}
      value={value}
      onChange={onChange}
      options={[
        { v: '0', label: 'Never' },
        { v: '1', label: 'Sometimes' },
        { v: '2', label: 'Often' },
        { v: '3', label: 'Very Often' },
      ]}
    />
  );
}

function Likert14({ value, onChange, questionId }: { value: string; onChange: (v: string) => void; questionId: string }) {
  return (
    <ChoiceGroup
      ariaLabel={`Response for question ${questionId}`}
      value={value}
      onChange={onChange}
      options={[
        { v: '1', label: 'Not true' },
        { v: '2', label: 'Sometimes' },
        { v: '3', label: 'Often' },
        { v: '4', label: 'Almost always' },
      ]}
    />
  );
}

function Performance15({ value, onChange, questionId }: { value: string; onChange: (v: string) => void; questionId: string }) {
  return (
    <ChoiceGroup
      ariaLabel={`Response for question ${questionId}`}
      value={value}
      onChange={onChange}
      options={[
        { v: '1', label: 'Excellent' },
        { v: '2', label: 'Above avg' },
        { v: '3', label: 'Average' },
        { v: '4', label: 'Problem' },
        { v: '5', label: 'Major problem' },
      ]}
    />
  );
}

function YesNo({ value, onChange, questionId }: { value: string; onChange: (v: string) => void; questionId: string }) {
  return (
    <div className="flex gap-2" role="radiogroup" aria-label={`Response for question ${questionId}`}>
      {(['yes', 'no'] as const).map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={value === o}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onChange(o)}
          className={`${choiceBtn} px-3 py-1 text-sm capitalize ${value === o ? choiceSelected : choiceIdle}`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

export default function AssessmentConductPage() {
  const { typeId } = useParams<{ typeId: string }>();
  const [searchParams] = useSearchParams();
  const presetChildId = searchParams.get('childId');
  const navigate = useNavigate();

  const [template, setTemplate] = useState<AssessmentTemplate | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [childId, setChildId] = useState(presetChildId ?? '');
  const [assessedAt, setAssessedAt] = useState(todayInput());
  const [respondent, setRespondent] = useState('');
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!typeId) return;
    (async () => {
      try {
        const [t, { children: kids }] = await Promise.all([getAssessmentTemplate(typeId), listChildren()]);
        setTemplate(t);
        setChildren(kids);
        if (t.respondentOptions[0]) setRespondent(t.respondentOptions[0]);
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [typeId]);

  const setAnswer = (qid: string, val: string) => setResponses((prev) => ({ ...prev, [qid]: val }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!typeId || !childId || !template) return;
    const missing = template.questions.filter((q) => !responses[q.id]);
    if (missing.length > 0) {
      setError(`Please answer all ${template.questions.length} items (${missing.length} remaining).`);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const saved = await createAssessment({
        childId,
        assessmentType: typeId,
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
  if (!template || !typeId) return null;

  const subscales = [...new Set(template.questions.map((q) => q.subscale).filter(Boolean))];

  return (
    <div className="space-y-4">
      <PageTitle back={<BackButton fallback="/admin/assessments" />}>{template.name}</PageTitle>
      <p className="text-sm text-slate-600">{template.description}</p>
      <p className="text-xs text-slate-400">{template.reference}</p>

      {error && <ErrorMessage error={error} />}

      <form onSubmit={submit} className="space-y-4">
        <Card>
          <div className="grid gap-4 sm:grid-cols-2">
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
            <Field label="Assessment date" required>
              <input type="date" className={inputCls} value={assessedAt} onChange={(e) => setAssessedAt(e.target.value)} required />
            </Field>
            <Field label="Respondent" required>
              <select className={inputCls} value={respondent} onChange={(e) => setRespondent(e.target.value)} required>
                {template.respondentOptions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </Card>

        {subscales.length > 0
          ? subscales.map((scale) => (
              <Card key={scale}>
                <h2 className="mb-4 font-bold text-slate-900">{scale}</h2>
                <ol className="space-y-4">
                  {template.questions
                    .filter((q) => q.subscale === scale)
                    .map((q, i) => (
                      <li key={q.id} className="border-b border-slate-100 pb-4 last:border-0">
                        <p className="mb-2 text-sm text-slate-800">
                          {i + 1}. {q.text}
                        </p>
                        {isPerformanceQuestion(template, q.id) ? (
                          <Performance15 questionId={q.id} value={responses[q.id] ?? ''} onChange={(v) => setAnswer(q.id, v)} />
                        ) : template.inputType === 'likert_0_3' ? (
                          <Likert03 questionId={q.id} value={responses[q.id] ?? ''} onChange={(v) => setAnswer(q.id, v)} />
                        ) : template.inputType === 'likert_1_4' ? (
                          <Likert14 questionId={q.id} value={responses[q.id] ?? ''} onChange={(v) => setAnswer(q.id, v)} />
                        ) : (
                          <YesNo questionId={q.id} value={responses[q.id] ?? ''} onChange={(v) => setAnswer(q.id, v)} />
                        )}
                      </li>
                    ))}
                </ol>
              </Card>
            ))
          : (
            <Card>
              <h2 className="mb-4 font-bold text-slate-900">Checklist items</h2>
              <ol className="space-y-4">
                {template.questions.map((q, i) => (
                  <li key={q.id} className="border-b border-slate-100 pb-4 last:border-0">
                    <p className="mb-2 text-sm text-slate-800">
                      {i + 1}. {q.text}
                    </p>
                    {template.inputType === 'likert_1_4' ? (
                      <Likert14 questionId={q.id} value={responses[q.id] ?? ''} onChange={(v) => setAnswer(q.id, v)} />
                    ) : (
                      <YesNo questionId={q.id} value={responses[q.id] ?? ''} onChange={(v) => setAnswer(q.id, v)} />
                    )}
                  </li>
                ))}
              </ol>
            </Card>
          )}

        <Card>
          <Field label="Clinician notes (optional)">
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
