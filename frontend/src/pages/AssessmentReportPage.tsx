import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getAssessment, type AssessmentTemplate, type ChildAssessment } from '../api/assessments';
import { errorMessage } from '../api/client';
import { Spinner, ErrorMessage, btnPrimary, btnSecondary } from '../components/ui';
import BackButton from '../components/BackButton';
import { formatDate } from '../utils/format';

const LIKERT_03 = ['Never', 'Sometimes', 'Often', 'Very Often'];
const LIKERT_14 = ['', 'Not true', 'Sometimes true', 'Often true', 'Almost always true'];
const PERF_15 = ['', 'Excellent', 'Above average', 'Average', 'Somewhat of a problem', 'Problematic'];

function formatAnswer(template: AssessmentTemplate, questionId: string, raw: unknown): string {
  const v = String(raw ?? '');
  if (template.id === 'vanderbilt' && questionId.startsWith('perf_')) {
    const n = parseInt(v, 10);
    return PERF_15[n] ?? v;
  }
  if (template.inputType === 'likert_0_3') return LIKERT_03[parseInt(v, 10)] ?? v;
  if (template.inputType === 'likert_1_4') {
    const n = parseInt(v, 10);
    return LIKERT_14[n] ?? v;
  }
  return v === 'yes' ? 'Yes' : v === 'no' ? 'No' : v;
}

function riskBadge(scores: Record<string, unknown>) {
  const level = scores.riskLevel as string | undefined;
  if (!level) return null;
  const cls =
    level === 'high' ? 'bg-red-100 text-red-800' : level === 'moderate' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800';
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${cls}`}>{level} concern</span>
  );
}

export default function AssessmentReportPage() {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const [assessment, setAssessment] = useState<ChildAssessment | null>(null);
  const [template, setTemplate] = useState<AssessmentTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!assessmentId) return;
    getAssessment(assessmentId)
      .then(({ assessment: a, template: t }) => {
        setAssessment(a);
        setTemplate(t);
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [assessmentId]);

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!assessment || !template) return null;

  const scores = assessment.scores ?? {};
  const childName = [assessment.childFirstName, assessment.childLastName].filter(Boolean).join(' ');

  return (
    <div>
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
        <BackButton fallback="/admin/assessments" />
        <div className="flex gap-2">
          <button type="button" className={btnPrimary} onClick={() => window.print()}>
            Print report
          </button>
          <button type="button" className={btnSecondary} onClick={() => window.history.back()}>
            Back
          </button>
        </div>
      </div>

      <article className="print-report mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-8 shadow-sm print:border-0 print:shadow-none">
        <header className="border-b border-slate-200 pb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-primary">HelixCareAI</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">{template.name}</h1>
              <p className="text-sm text-slate-500">Screening & Assessment Report</p>
            </div>
            {riskBadge(scores)}
          </div>
        </header>

        <section className="mt-6 grid gap-4 border-b border-slate-200 pb-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Child</p>
            <p className="font-semibold text-slate-900">{childName || '—'}</p>
            {assessment.childCode && <p className="text-sm text-slate-600">ID: {assessment.childCode}</p>}
            {assessment.childDob && <p className="text-sm text-slate-600">DOB: {formatDate(assessment.childDob)}</p>}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Assessment details</p>
            <p className="text-sm text-slate-800">Date: {formatDate(assessment.assessedAt)}</p>
            {assessment.respondent && <p className="text-sm text-slate-800">Respondent: {assessment.respondent}</p>}
            {assessment.assessorName && <p className="text-sm text-slate-800">Completed by: {assessment.assessorName}</p>}
          </div>
        </section>

        <section className="mt-6 border-b border-slate-200 pb-6">
          <h2 className="text-lg font-bold text-slate-900">Summary & interpretation</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-800">{assessment.interpretation}</p>
          {scores.total != null && (
            <p className="mt-2 text-sm font-semibold text-slate-700">Total / key score: {String(scores.total)}</p>
          )}
          {typeof scores.subscales === 'object' && scores.subscales !== null && (
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(scores.subscales as Record<string, number>).map(([k, v]) => (
                <span key={k} className="rounded bg-slate-100 px-2 py-1 text-xs capitalize text-slate-700">
                  {k.replace(/([A-Z])/g, ' $1')}: {v}
                </span>
              ))}
            </div>
          )}
        </section>

        <section className="mt-6">
          <h2 className="text-lg font-bold text-slate-900">Item responses</h2>
          <table className="mt-3 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                <th className="py-2 pr-2">#</th>
                <th className="py-2 pr-2">Item</th>
                <th className="py-2">Response</th>
              </tr>
            </thead>
            <tbody>
              {template.questions.map((q, i) => (
                <tr key={q.id} className="border-b border-slate-100">
                  <td className="py-2 pr-2 align-top text-slate-500">{i + 1}</td>
                  <td className="py-2 pr-2 align-top text-slate-800">{q.text}</td>
                  <td className="py-2 align-top font-medium text-slate-900">
                    {formatAnswer(template, q.id, assessment.responses[q.id])}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {assessment.notes && (
          <section className="mt-6 border-t border-slate-200 pt-6">
            <h2 className="text-lg font-bold text-slate-900">Clinician notes</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{assessment.notes}</p>
          </section>
        )}

        <footer className="mt-8 border-t border-slate-200 pt-4 text-xs text-slate-400">
          <p>{template.reference}</p>
          <p className="mt-1">
            This report is a screening summary generated by HelixCareAI and does not replace a formal diagnostic evaluation.
            Generated {formatDate(assessment.createdAt)}.
          </p>
        </footer>
      </article>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-report, .print-report * { visibility: visible; }
          .print-report { position: absolute; left: 0; top: 0; width: 100%; max-width: 100%; padding: 0; }
          .no-print { display: none !important; }
          aside, header { display: none !important; }
          main { padding: 0 !important; }
        }
      `}</style>
    </div>
  );
}
