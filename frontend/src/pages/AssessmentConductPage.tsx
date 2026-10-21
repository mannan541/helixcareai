import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getAssessmentTemplate, createAssessment } from '../api/assessments';
import { useAuth } from '../context/AuthContext';
import { Card, Spinner, ErrorMessage } from '../components/ui';
import PageHeader from '../components/PageHeader';

const templateMeta: Record<string, { title: string; description: string }> = {
  adhd_rating_scale: {
    title: 'ADHD Rating Scale',
    description: 'Standard ADHD rating assessment',
  },
  vanderbilt: {
    title: 'Vanderbilt Assessment',
    description: 'Vanderbilt ADHD Diagnostic Rating Scales',
  },
  social_responsiveness_scale: {
    title: 'Social Responsiveness Scale (SRS)',
    description: 'Assessment of social impairment',
  },
  autism_checklist: {
    title: 'Autism Checklist',
    description: 'Autism screening checklist',
  },
};

export default function AssessmentConductPage() {
  const { templateId } = useParams<{ templateId?: string }>();
  const [searchParams] = useSearchParams();
  const childId = searchParams.get('childId') || '';
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const key = templateId || 'adhd_rating_scale';
  const meta = templateMeta[key] || { title: key, description: '' };

  const start = async () => {
    setError('');
    setLoading(true);
    try {
      const assessment = await createAssessment({ assessmentType: key, childId: childId || undefined });
      navigate(`/assessments/report/${assessment.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to start assessment');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (childId && user) {
      start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <PageHeader title={meta.title} back="/assessments/admin" />
      <Card>
        <h2 className="text-lg font-semibold text-slate-900">{meta.title}</h2>
        <p className="mt-1 text-sm text-slate-600">{meta.description}</p>
        {error && <div className="mt-3"><ErrorMessage error={error} /></div>}
        <button
          onClick={start}
          disabled={loading}
          className="mt-4 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
        >
          {loading ? 'Starting...' : 'Start Assessment'}
        </button>
      </Card>
    </div>
  );
}
