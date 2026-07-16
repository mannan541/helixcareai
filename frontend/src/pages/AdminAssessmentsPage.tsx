import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listAssessmentTemplates, listRecentAssessments, type AssessmentTemplateSummary, type ChildAssessment } from '../api/assessments';
import { errorMessage } from '../api/client';
import { Card, Spinner, ErrorMessage, PageTitle, btnPrimary } from '../components/ui';
import { formatDate } from '../utils/format';

const TYPE_ICONS: Record<string, string> = {
  adhd_rating_scale: '🧠',
  vanderbilt: '📋',
  social_responsiveness_scale: '🤝',
  autism_checklist: '🧩',
};

export default function AdminAssessmentsPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<AssessmentTemplateSummary[]>([]);
  const [recent, setRecent] = useState<ChildAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [t, r] = await Promise.all([listAssessmentTemplates(), listRecentAssessments(25)]);
      setTemplates(t);
      setRecent(r);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage error={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      <PageTitle>Assessment & Screening</PageTitle>
      <p className="text-sm text-slate-600">
        Standardized screening tools for ADHD, social communication, and autism. Complete an assessment for a child and
        generate a printable clinical report.
      </p>

      <section>
        <h2 className="mb-3 text-lg font-bold text-slate-900">Standard assessments</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {templates.map((t) => (
            <Card key={t.id} className="flex h-full flex-col">
              <div className="flex items-start gap-3">
                <span className="text-3xl">{TYPE_ICONS[t.id] ?? '📊'}</span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-slate-900">{t.name}</h3>
                  <p className="mt-1 text-xs text-slate-500">{t.shortName} · {t.questionCount} items</p>
                  <p className="mt-2 text-sm text-slate-600">{t.description}</p>
                </div>
              </div>
              <button
                type="button"
                className={`${btnPrimary} mt-4 w-full`}
                onClick={() => navigate(`/admin/assessments/conduct/${t.id}`)}
              >
                Start assessment
              </button>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-slate-900">Recent assessments</h2>
        {recent.length === 0 ? (
          <Card>
            <p className="text-center text-sm text-slate-500">No assessments completed yet.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {recent.map((a) => (
              <Card key={a.id} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">
                    {a.assessmentName}
                    <span className="ml-2 text-sm font-normal text-slate-500">
                      — {a.childFirstName} {a.childLastName}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {formatDate(a.assessedAt)}
                    {a.respondent ? ` · ${a.respondent}` : ''}
                    {a.assessorName ? ` · by ${a.assessorName}` : ''}
                  </p>
                  {a.interpretation && (
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600">{a.interpretation}</p>
                  )}
                </div>
                <Link
                  to={`/admin/assessments/${a.id}/report`}
                  className="shrink-0 rounded-lg border border-primary px-3 py-1.5 text-sm font-semibold text-primary hover:bg-primary-light"
                >
                  Printable report
                </Link>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
