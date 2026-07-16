import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getChild, deleteChild } from '../api/children';
import { listTherapists } from '../api/auth';
import type { Child, User } from '../api/types';
import { errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Card,
  Spinner,
  ErrorMessage,
  PageTitle,
  btnSecondary,
  btnDanger,
  StatusBadge,
  ConfirmDialog,
} from '../components/ui';
import BackButton from '../components/BackButton';
import { formatDate } from '../utils/format';

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === '') return null;
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-1.5 text-sm last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900">{value}</span>
    </div>
  );
}

function ScoreBar({ label, score }: { label: string; score?: number }) {
  if (score == null) return null;
  return (
    <div className="py-1">
      <div className="flex justify-between text-xs text-slate-600">
        <span>{label}</span>
        <span className="font-semibold">{score}/10</span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.min(score * 10, 100)}%` }} />
      </div>
    </div>
  );
}

export default function ChildDetailPage() {
  const { childId } = useParams<{ childId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [child, setChild] = useState<Child | null>(null);
  const [therapists, setTherapists] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = async () => {
    if (!childId) return;
    setLoading(true);
    setError('');
    try {
      const c = await getChild(childId);
      setChild(c);
      listTherapists().then(setTherapists).catch(() => {});
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId]);

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage error={error} onRetry={load} />;
  if (!child || !childId) return null;

  const canEdit = user?.role === 'admin' || user?.role === 'therapist';
  const isAdmin = user?.role === 'admin';
  const assignedIds = child.assignedTherapistIds ?? (child.assignedTherapistId ? [child.assignedTherapistId] : []);
  const assignedTherapists = therapists.filter((t) => assignedIds.includes(t.id));

  const actions = [
    { to: `/children/${childId}/timeline`, label: 'Timeline', icon: '🕐', desc: 'Full history — sessions, appointments, comments & more' },
    { to: `/children/${childId}/sessions`, label: 'Sessions', icon: '📝', desc: 'View & log therapy sessions' },
    { to: `/children/${childId}/analytics`, label: 'Performance', icon: '📈', desc: 'Charts of session metrics' },
    { to: `/children/${childId}/report`, label: 'Export report', icon: '📄', desc: 'Attendance, performance & progress' },
    { to: `/children/${childId}/chat`, label: 'AI Assistant', icon: '💬', desc: 'Ask about this child' },
    { to: `/children/${childId}/schedule`, label: 'Appointments', icon: '📅', desc: 'Scheduled appointments' },
    { to: `/children/${childId}/resources`, label: 'Resources', icon: '📚', desc: 'Assigned worksheets, stories & materials' },
  ];

  return (
    <div className="space-y-4">
      <PageTitle
        back={<BackButton fallback="/children" />}
        actions={
          <>
            {canEdit && (
              <button className={btnSecondary} onClick={() => navigate(`/children/${childId}/edit`)}>
                Edit
              </button>
            )}
            {isAdmin && (
              <button className={btnDanger} onClick={() => setConfirmDelete(true)}>
                Delete
              </button>
            )}
          </>
        }
      >
        {child.firstName} {child.lastName}
      </PageTitle>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {actions.map((a) => (
          <Link key={a.to} to={a.to}>
            <Card className="h-full transition hover:border-primary hover:shadow">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{a.icon}</span>
                <div>
                  <p className="font-semibold text-slate-900">{a.label}</p>
                  <p className="text-xs text-slate-500">{a.desc}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-2 font-bold">Profile</h2>
          <InfoRow label="Child code" value={child.childCode} />
          <InfoRow label="Gender" value={child.gender} />
          <InfoRow label="Date of birth" value={child.dateOfBirth ? formatDate(child.dateOfBirth) : null} />
          <InfoRow label="Primary language" value={child.primaryLanguage} />
          <InfoRow label="Communication type" value={child.communicationType} />
          <InfoRow label="Referred by" value={child.referredBy} />
          {child.status && (
            <div className="flex justify-between gap-4 py-1.5 text-sm">
              <span className="text-slate-500">Status</span>
              <StatusBadge status={child.status} />
            </div>
          )}
        </Card>

        <Card>
          <h2 className="mb-2 font-bold">Diagnosis</h2>
          <InfoRow label="Diagnosis" value={child.diagnosis} />
          <InfoRow label="Diagnosis type" value={child.diagnosisType} />
          <InfoRow label="Autism level" value={child.autismLevel} />
          <InfoRow label="Diagnosis date" value={child.diagnosisDate ? formatDate(child.diagnosisDate) : null} />
          <InfoRow label="Medical conditions" value={child.medicalConditions} />
          <InfoRow label="Medications" value={child.medications} />
          <InfoRow label="Allergies" value={child.allergies} />
        </Card>

        <Card>
          <h2 className="mb-2 font-bold">Therapy</h2>
          <InfoRow label="Therapy status" value={child.therapyStatus} />
          <InfoRow
            label="Therapy start"
            value={child.therapyStartDate ? formatDate(child.therapyStartDate) : null}
          />
          <InfoRow label="Sessions / week" value={child.sessionsPerWeek} />
          <InfoRow
            label="Assigned therapists"
            value={
              assignedTherapists.length > 0
                ? assignedTherapists.map((t) => t.fullName).join(', ')
                : assignedIds.length > 0
                  ? `${assignedIds.length} assigned`
                  : null
            }
          />
        </Card>

        <Card>
          <h2 className="mb-2 font-bold">Skill scores</h2>
          <ScoreBar label="Communication" score={child.communicationScore} />
          <ScoreBar label="Social" score={child.socialScore} />
          <ScoreBar label="Behavioral" score={child.behavioralScore} />
          <ScoreBar label="Cognitive" score={child.cognitiveScore} />
          <ScoreBar label="Motor skills" score={child.motorSkillScore} />
          {child.communicationScore == null &&
            child.socialScore == null &&
            child.behavioralScore == null &&
            child.cognitiveScore == null &&
            child.motorSkillScore == null && <p className="text-sm text-slate-500">No scores recorded yet</p>}
        </Card>
      </div>

      {(child.notes || child.behavioralNotes) && (
        <Card>
          <h2 className="mb-2 font-bold">Notes</h2>
          {child.notes && <p className="whitespace-pre-wrap text-sm text-slate-700">{child.notes}</p>}
          {child.behavioralNotes && (
            <>
              <h3 className="mt-3 text-sm font-semibold text-slate-900">Behavioral notes</h3>
              <p className="whitespace-pre-wrap text-sm text-slate-700">{child.behavioralNotes}</p>
            </>
          )}
        </Card>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete child"
        message={`Are you sure you want to delete ${child.firstName} ${child.lastName}? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={async () => {
          try {
            await deleteChild(childId);
            navigate('/children');
          } catch (err) {
            setConfirmDelete(false);
            setError(errorMessage(err));
          }
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
