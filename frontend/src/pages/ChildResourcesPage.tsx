import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getChild } from '../api/children';
import {
  listChildResources,
  unassignResource,
  resolveResourceFile,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  type TherapyResource,
} from '../api/resources';
import type { Child } from '../api/types';
import { errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Card, Spinner, ErrorMessage, EmptyState, PageTitle, btnSecondary, btnDanger, ConfirmDialog } from '../components/ui';
import BackButton from '../components/BackButton';
import { formatDate } from '../utils/format';

async function openResource(r: TherapyResource) {
  const full = await resolveResourceFile(r);
  if (full.fileUrl) {
    window.open(full.fileUrl, '_blank', 'noopener,noreferrer');
    return;
  }
  if (full.content) {
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(
        `<html><head><title>${full.title}</title></head><body style="font-family:system-ui;max-width:720px;margin:24px auto;line-height:1.6"><h1>${full.title}</h1><pre style="white-space:pre-wrap">${full.content.replace(/</g, '&lt;')}</pre></body></html>`
      );
      w.document.close();
    }
  }
}

export default function ChildResourcesPage() {
  const { childId } = useParams<{ childId: string }>();
  const { user } = useAuth();
  const [child, setChild] = useState<Child | null>(null);
  const [resources, setResources] = useState<TherapyResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [unassignTarget, setUnassignTarget] = useState<TherapyResource | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const canManage = user?.role === 'admin' || user?.role === 'therapist';

  const load = async () => {
    if (!childId) return;
    setLoading(true);
    setError('');
    try {
      const [c, rows] = await Promise.all([getChild(childId), listChildResources(childId)]);
      setChild(c);
      setResources(rows);
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

  const grouped = resources.reduce(
    (acc, r) => {
      if (!acc[r.category]) acc[r.category] = [];
      acc[r.category].push(r);
      return acc;
    },
    {} as Record<string, TherapyResource[]>
  );

  return (
    <div className="space-y-4">
      <PageTitle back={<BackButton fallback={childId ? `/children/${childId}` : '/children'} />}>
        Resources{child ? ` — ${child.firstName} ${child.lastName}` : ''}
      </PageTitle>
      <p className="text-sm text-slate-600">Therapy materials assigned to this child — worksheets, schedules, stories, and more.</p>

      {resources.length === 0 ? (
        <EmptyState>
          <p className="text-4xl">📚</p>
          <p className="mt-3 font-semibold text-slate-700">No resources assigned yet</p>
          <p className="mt-1 text-slate-500">
            {canManage
              ? 'Open the Resource Library to upload materials and assign them to this child.'
              : 'Your therapist will assign worksheets, schedules, and stories here.'}
          </p>
        </EmptyState>
      ) : (
        Object.entries(grouped).map(([cat, items]) => (
          <section key={cat}>
            <h2 className="mb-2 flex items-center gap-2 text-lg font-bold text-slate-900">
              <span>{CATEGORY_ICONS[items[0].category]}</span>
              {CATEGORY_LABELS[items[0].category]}
            </h2>
            <div className="space-y-2">
              {items.map((r) => (
                <Card key={r.assignmentId ?? r.id} className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">{r.title}</p>
                    {r.description && <p className="mt-1 text-sm text-slate-600">{r.description}</p>}
                    {r.assignmentNotes && (
                      <p className="mt-2 rounded bg-primary-light px-2 py-1 text-sm text-primary-dark">
                        Note: {r.assignmentNotes}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-slate-400">
                      Assigned {r.assignedAt ? formatDate(r.assignedAt) : '—'}
                      {r.assignerName ? ` by ${r.assignerName}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      className={btnSecondary}
                      disabled={openingId === r.id}
                      onClick={async () => {
                        setOpeningId(r.id);
                        try {
                          await openResource(r);
                        } catch (err) {
                          setError(errorMessage(err));
                        } finally {
                          setOpeningId(null);
                        }
                      }}
                    >
                      {openingId === r.id ? 'Opening…' : 'Open'}
                    </button>
                    {canManage && r.assignmentId && (
                      <button type="button" className={btnDanger} onClick={() => setUnassignTarget(r)}>
                        Remove
                      </button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </section>
        ))
      )}

      <ConfirmDialog
        open={Boolean(unassignTarget)}
        title="Remove assignment"
        message={`Remove “${unassignTarget?.title}” from this child's resources? The file stays in the library.`}
        confirmLabel="Remove"
        danger
        onConfirm={async () => {
          if (!unassignTarget?.assignmentId) return;
          try {
            await unassignResource(unassignTarget.assignmentId);
            setUnassignTarget(null);
            load();
          } catch (err) {
            setError(errorMessage(err));
            setUnassignTarget(null);
          }
        }}
        onCancel={() => setUnassignTarget(null)}
      />
    </div>
  );
}
