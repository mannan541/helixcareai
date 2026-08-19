import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getCustomTemplate,
  createCustomTemplate,
  updateCustomTemplate,
  type CustomQuestion,
  type CustomQuestionType,
} from '../api/assessments';
import { errorMessage } from '../api/client';
import { Card, Field, Spinner, ErrorMessage, PageTitle, btnPrimary, btnSecondary, inputCls } from '../components/ui';
import BackButton from '../components/BackButton';

type EditableQuestion = {
  key: string; // stable React key, independent of the (editable) id text
  id: string;
  text: string;
  type: CustomQuestionType;
  options: string[];
  scaleMax: number;
};

const QUESTION_TYPE_LABELS: Record<CustomQuestionType, string> = {
  single_choice: 'Single choice',
  multiple_choice: 'Multiple choice',
  scale: 'Scale (1–N)',
  text: 'Free text',
};

let nextKey = 1;
function newQuestion(): EditableQuestion {
  return { key: `new-${nextKey++}`, id: '', text: '', type: 'single_choice', options: ['', ''], scaleMax: 5 };
}

export default function CustomAssessmentBuilderPage() {
  const { templateId } = useParams<{ templateId?: string }>();
  const isEdit = Boolean(templateId);
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<EditableQuestion[]>([newQuestion()]);
  const [loading, setLoading] = useState(isEdit);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!templateId) return;
    getCustomTemplate(templateId)
      .then((t) => {
        setName(t.name);
        setDescription(t.description ?? '');
        setQuestions(
          t.questions.map((q) => ({
            key: q.id,
            id: q.id,
            text: q.text,
            type: q.type,
            options: q.options?.length ? q.options : ['', ''],
            scaleMax: q.scaleMax ?? 5,
          }))
        );
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [templateId]);

  const updateQuestion = (key: string, patch: Partial<EditableQuestion>) => {
    setQuestions((prev) => prev.map((q) => (q.key === key ? { ...q, ...patch } : q)));
  };

  const addQuestion = () => setQuestions((prev) => [...prev, newQuestion()]);
  const removeQuestion = (key: string) => setQuestions((prev) => prev.filter((q) => q.key !== key));

  const addOption = (key: string) =>
    setQuestions((prev) => prev.map((q) => (q.key === key ? { ...q, options: [...q.options, ''] } : q)));
  const updateOption = (key: string, idx: number, value: string) =>
    setQuestions((prev) =>
      prev.map((q) => (q.key === key ? { ...q, options: q.options.map((o, i) => (i === idx ? value : o)) } : q))
    );
  const removeOption = (key: string, idx: number) =>
    setQuestions((prev) =>
      prev.map((q) => (q.key === key ? { ...q, options: q.options.filter((_, i) => i !== idx) } : q))
    );

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Title is required.');
      return;
    }
    if (questions.length === 0) {
      setError('Add at least one question.');
      return;
    }
    for (const [i, q] of questions.entries()) {
      if (!q.text.trim()) {
        setError(`Question ${i + 1} needs text.`);
        return;
      }
      if ((q.type === 'single_choice' || q.type === 'multiple_choice')) {
        const opts = q.options.map((o) => o.trim()).filter(Boolean);
        if (opts.length < 2) {
          setError(`Question ${i + 1} (${q.text}) needs at least 2 options.`);
          return;
        }
      }
    }

    const payload: CustomQuestion[] = questions.map((q, i) => ({
      id: q.id.trim() || `q${i + 1}`,
      text: q.text.trim(),
      type: q.type,
      ...(q.type === 'single_choice' || q.type === 'multiple_choice'
        ? { options: q.options.map((o) => o.trim()).filter(Boolean) }
        : {}),
      ...(q.type === 'scale' ? { scaleMax: q.scaleMax } : {}),
    }));

    setBusy(true);
    try {
      if (isEdit && templateId) {
        await updateCustomTemplate(templateId, { name: name.trim(), description: description.trim() || undefined, questions: payload });
      } else {
        await createCustomTemplate({ name: name.trim(), description: description.trim() || undefined, questions: payload });
      }
      navigate('/admin/assessments');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <PageTitle back={<BackButton fallback="/admin/assessments" />}>
        {isEdit ? 'Edit custom assessment' : 'Create custom assessment'}
      </PageTitle>
      <p className="text-sm text-slate-600">
        Build your own screening or check-in form with custom questions, multiple choice, scales, or free text.
      </p>

      {error && <ErrorMessage error={error} />}

      <form onSubmit={submit} className="space-y-4">
        <Card>
          <div className="space-y-4">
            <Field label="Title" required>
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required />
            </Field>
            <Field label="Description">
              <textarea className={`${inputCls} min-h-16`} value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
          </div>
        </Card>

        {questions.map((q, i) => (
          <Card key={q.key}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Question {i + 1}</h3>
              {questions.length > 1 && (
                <button type="button" className="text-xs font-semibold text-red-600 hover:underline" onClick={() => removeQuestion(q.key)}>
                  Remove
                </button>
              )}
            </div>
            <div className="space-y-3">
              <Field label="Question text" required>
                <input className={inputCls} value={q.text} onChange={(e) => updateQuestion(q.key, { text: e.target.value })} required />
              </Field>
              <Field label="Answer type">
                <select
                  className={inputCls}
                  value={q.type}
                  onChange={(e) => updateQuestion(q.key, { type: e.target.value as CustomQuestionType })}
                >
                  {(Object.keys(QUESTION_TYPE_LABELS) as CustomQuestionType[]).map((t) => (
                    <option key={t} value={t}>{QUESTION_TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </Field>

              {(q.type === 'single_choice' || q.type === 'multiple_choice') && (
                <Field label="Options (at least 2)">
                  <div className="space-y-2">
                    {q.options.map((opt, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          className={inputCls}
                          placeholder={`Option ${idx + 1}`}
                          value={opt}
                          onChange={(e) => updateOption(q.key, idx, e.target.value)}
                        />
                        {q.options.length > 2 && (
                          <button type="button" className={btnSecondary} onClick={() => removeOption(q.key, idx)}>
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                    <button type="button" className={btnSecondary} onClick={() => addOption(q.key)}>
                      + Add option
                    </button>
                  </div>
                </Field>
              )}

              {q.type === 'scale' && (
                <Field label="Scale maximum (2–10)">
                  <input
                    type="number"
                    min={2}
                    max={10}
                    className={`${inputCls} max-w-[8rem]`}
                    value={q.scaleMax}
                    onChange={(e) => updateQuestion(q.key, { scaleMax: Math.min(10, Math.max(2, parseInt(e.target.value, 10) || 5)) })}
                  />
                </Field>
              )}
            </div>
          </Card>
        ))}

        <button type="button" className={btnSecondary} onClick={addQuestion}>
          + Add question
        </button>

        <div className="flex gap-2">
          <button type="submit" className={btnPrimary} disabled={busy}>
            {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Create assessment'}
          </button>
          <button type="button" className={btnSecondary} onClick={() => navigate('/admin/assessments')}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
