import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  listAssessmentTemplates,
  listRecentAssessments,
  listCustomTemplates,
  deleteCustomTemplate,
  type AssessmentTemplateSummary,
  type ChildAssessment,
  type CustomAssessmentTemplate,
} from '../api/assessments';
import { errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Card,
  Field,
  Spinner,
  ErrorMessage,
  EmptyState,
  PageTitle,
  btnPrimary,
  btnSecondary,
  btnDanger,
  inputCls,
  ConfirmDialog,
} from '../components/ui';
import { formatDate } from '../utils/format';

const TYPE_ICONS: Record<string, string> = {
  adhd_rating_scale: '🧠',
  vanderbilt: '📋',
  social_responsiveness_scale: '🤝',
  autism_checklist: '🧩',
};

export default function AdminAssessmentsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [templates, setTemplates] = useState<AssessmentTemplateSummary[]>([]);
  const [customTemplates, setCustomTemplates] = useState<CustomAssessmentTemplate[]>([]);
  const [recent, setRecent] = useState<ChildAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<CustomAssessmentTemplate | null>(null);

  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterQ, setFilterQ] = useState('');

  const load = async (opts?: { silent?: boolean }) => {
    if (opts?.silent) setRefreshing(true);
    else setLoading(true);
    setError('');
    const isCustomFilter = filterType.startsWith('custom:');
    try {
      const [t, ct, r] = await Promise.all([
        listAssessmentTemplates(),
        listCustomTemplates(!isAdmin),
        listRecentAssessments({
          limit: 100,
          from: filterFrom || undefined,
          to: filterTo || undefined,
          type: filterType && !isCustomFilter ? filterType : undefined,
          customTemplateId: isCustomFilter ? filterType.slice('custom:'.length) : undefined,
          q: filterQ.trim() || undefined,
        }),
      ]);
      setTemplates(t);
      setCustomTemplates(ct);
      setRecent(r);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasFilters = Boolean(filterFrom || filterTo || filterType || filterQ);
  const clearFilters = () => {
    setFilterFrom('');
    setFilterTo('');
    setFilterType('');
    setFilterQ('');
    setLoading(true);
    setError('');
    Promise.all([listAssessmentTemplates(), listCustomTemplates(!isAdmin), listRecentAssessments({ limit: 100 })])
      .then(([t, ct, r]) => {
        setTemplates(t);
        setCustomTemplates(ct);
        setRecent(r);
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  };

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
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Custom assessments</h2>
          <button type="button" className={btnSecondary} onClick={() => navigate('/admin/assessments/custom/new')}>
            + Create custom assessment
          </button>
        </div>
        {customTemplates.length === 0 ? (
          <EmptyState>
            <p className="text-sm text-slate-500">
              No custom assessments yet. Build your own with custom questions, multiple choice, scales, or free text.
            </p>
          </EmptyState>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {customTemplates.map((t) => (
              <Card key={t.id} className="flex h-full flex-col">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">📝</span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-slate-900">
                      {t.name}
                      {!t.isActive && <span className="ml-2 text-xs font-normal text-slate-400">(inactive)</span>}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">{t.questions.length} questions</p>
                    {t.description && <p className="mt-2 text-sm text-slate-600">{t.description}</p>}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={`${btnPrimary} flex-1`}
                    onClick={() => navigate(`/admin/assessments/custom/${t.id}/conduct`)}
                  >
                    Start assessment
                  </button>
                  {isAdmin && (
                    <>
                      <button
                        type="button"
                        className={btnSecondary}
                        onClick={() => navigate(`/admin/assessments/custom/${t.id}/edit`)}
                      >
                        Edit
                      </button>
                      <button type="button" className={btnDanger} onClick={() => setDeleteTarget(t)}>
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-slate-900">Recent assessments</h2>
        <Card className="mb-3">
          <div className="flex flex-wrap items-end gap-2">
            <Field label="From">
              <input type="date" className={inputCls} value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
            </Field>
            <Field label="To">
              <input type="date" className={inputCls} value={filterTo} onChange={(e) => setFilterTo(e.target.value)} />
            </Field>
            <Field label="Child name">
              <input
                className={`${inputCls} max-w-[10rem]`}
                placeholder="Search child…"
                value={filterQ}
                onChange={(e) => setFilterQ(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && load({ silent: true })}
              />
            </Field>
            <Field label="Assessment type">
              <select className={inputCls} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                <option value="">All types</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
                {customTemplates.map((t) => (
                  <option key={t.id} value={`custom:${t.id}`}>{t.name} (custom)</option>
                ))}
              </select>
            </Field>
            <button type="button" className={btnPrimary} disabled={refreshing} onClick={() => load({ silent: true })}>
              {refreshing ? 'Filtering…' : 'Apply'}
            </button>
            {hasFilters && (
              <button type="button" className={btnSecondary} onClick={clearFilters}>
                Clear
              </button>
            )}
          </div>
        </Card>
        {recent.length === 0 ? (
          <EmptyState>
            <p className="font-semibold text-slate-700">
              {hasFilters ? 'No assessments match these filters.' : 'No assessments completed yet.'}
            </p>
          </EmptyState>
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

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete custom assessment"
        message={`Delete "${deleteTarget?.name}"? This cannot be undone. If it has already been used for a saved assessment, deletion will be blocked — deactivate it instead.`}
        confirmLabel="Delete"
        danger
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            await deleteCustomTemplate(deleteTarget.id);
            setDeleteTarget(null);
            await load({ silent: true });
          } catch (err) {
            setError(errorMessage(err));
            setDeleteTarget(null);
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
