import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  listResources,
  createResourceWithFile,
  updateResourceWithFile,
  deleteResource,
  assignResource,
  resolveResourceFile,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  type ResourceCategory,
  type TherapyResource,
} from '../api/resources';
import { listChildren } from '../api/children';
import type { Child } from '../api/types';
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

const ALL_CATEGORIES: ResourceCategory[] = [
  'pdf',
  'worksheet',
  'visual_schedule',
  'flashcard',
  'social_story',
];

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
        `<pre style="font-family:system-ui;padding:24px;white-space:pre-wrap">${full.content.replace(/</g, '&lt;')}</pre>`
      );
      w.document.close();
    }
  }
}

export default function ResourceLibraryPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [resources, setResources] = useState<TherapyResource[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [category, setCategory] = useState<ResourceCategory | ''>('');
  const [search, setSearch] = useState('');
  const [listLoading, setListLoading] = useState(true);
  const [listRefreshing, setListRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<TherapyResource | null>(null);
  const [assignTarget, setAssignTarget] = useState<TherapyResource | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TherapyResource | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState<ResourceCategory>('worksheet');
  const [formContent, setFormContent] = useState('');
  const [formFile, setFormFile] = useState<File | null>(null);
  const [formBusy, setFormBusy] = useState(false);

  const [assignChildId, setAssignChildId] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const [assignBusy, setAssignBusy] = useState(false);

  const loadResources = async (opts?: { silent?: boolean }) => {
    if (opts?.silent) setListRefreshing(true);
    else setListLoading(true);
    setError('');
    try {
      const { resources: rows } = await listResources({
        category: category || undefined,
        q: search || undefined,
        limit: 100,
      });
      setResources(rows);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setListLoading(false);
      setListRefreshing(false);
    }
  };

  useEffect(() => {
    listChildren()
      .then(({ children: kids }) => setChildren(kids))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadResources();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const closeForm = () => {
    setShowAdd(false);
    setEditTarget(null);
    setFormTitle('');
    setFormDesc('');
    setFormContent('');
    setFormFile(null);
  };

  const startAdd = () => {
    setEditTarget(null);
    setFormTitle('');
    setFormDesc('');
    setFormCategory('worksheet');
    setFormContent('');
    setFormFile(null);
    setShowAdd(true);
  };

  const startEdit = (r: TherapyResource) => {
    setEditTarget(r);
    setFormTitle(r.title);
    setFormDesc(r.description ?? '');
    setFormCategory(r.category);
    setFormContent(r.content ?? '');
    setFormFile(null);
    setShowAdd(true);
  };

  const submitForm = async (e: FormEvent) => {
    e.preventDefault();
    setFormBusy(true);
    setError('');
    try {
      if (editTarget) {
        await updateResourceWithFile(
          editTarget.id,
          {
            title: formTitle,
            description: formDesc || undefined,
            category: formCategory,
            content: formContent.trim() || undefined,
          },
          formFile
        );
      } else {
        await createResourceWithFile(
          {
            title: formTitle,
            description: formDesc || undefined,
            category: formCategory,
            content: formContent.trim() || undefined,
          },
          formFile
        );
      }
      closeForm();
      await loadResources({ silent: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setFormBusy(false);
    }
  };

  const submitAssign = async () => {
    if (!assignTarget || !assignChildId) return;
    setAssignBusy(true);
    setError('');
    try {
      await assignResource(assignTarget.id, assignChildId, assignNotes.trim() || undefined);
      setAssignTarget(null);
      setAssignChildId('');
      setAssignNotes('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setAssignBusy(false);
    }
  };

  const handleOpen = async (r: TherapyResource) => {
    setOpeningId(r.id);
    setError('');
    try {
      await openResource(r);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setOpeningId(null);
    }
  };

  const canManage = user?.role === 'admin' || user?.role === 'therapist';

  return (
    <div className="space-y-4">
      <PageTitle
        actions={
          canManage && (
            <button type="button" className={btnPrimary} onClick={() => (showAdd ? closeForm() : startAdd())}>
              {showAdd ? 'Close form' : '+ Add resource'}
            </button>
          )
        }
      >
        Therapy Resource Library
      </PageTitle>
      <p className="text-sm text-slate-600">
        Store PDFs, worksheets, visual schedules, flashcards, and social stories. Assign materials directly to children.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategory('')}
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
            category === '' ? 'border-primary bg-primary text-white' : 'border-slate-200 bg-white text-slate-600'
          }`}
        >
          All
        </button>
        {ALL_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              category === c ? 'border-primary bg-primary text-white' : 'border-slate-200 bg-white text-slate-600'
            }`}
          >
            {CATEGORY_ICONS[c]} {CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          className={`${inputCls} max-w-md flex-1`}
          placeholder="Search resources…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && loadResources({ silent: true })}
        />
        <button type="button" className={btnSecondary} onClick={() => loadResources({ silent: true })} disabled={listRefreshing}>
          {listRefreshing ? 'Searching…' : 'Search'}
        </button>
      </div>

      {error && <ErrorMessage error={error} onRetry={() => loadResources()} />}

      {showAdd && canManage && (
        <Card>
          <h2 className="mb-4 font-bold">{editTarget ? `Edit resource — ${editTarget.title}` : 'Add resource'}</h2>
          <form onSubmit={submitForm} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Title" required>
                <input className={inputCls} value={formTitle} onChange={(e) => setFormTitle(e.target.value)} required />
              </Field>
              <Field label="Category" required>
                <select className={inputCls} value={formCategory} onChange={(e) => setFormCategory(e.target.value as ResourceCategory)}>
                  {ALL_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Description">
              <textarea className={`${inputCls} min-h-16`} value={formDesc} onChange={(e) => setFormDesc(e.target.value)} />
            </Field>
            <Field label={editTarget ? 'Replace file (optional — max 4 MB)' : 'Upload file (PDF, image — max 4 MB)'}>
              <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary-light/40 p-5">
                <input
                  id="resource-file-input"
                  type="file"
                  className="sr-only"
                  accept=".pdf,image/*,.doc,.docx"
                  onChange={(e) => setFormFile(e.target.files?.[0] ?? null)}
                />
                <label
                  htmlFor="resource-file-input"
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-primary-dark hover:shadow-xl active:translate-y-px"
                >
                  <span aria-hidden>📎</span>
                  {formFile ? 'Change file' : 'Choose file'}
                </label>
                {formFile ? (
                  <p className="mt-3 text-sm font-medium text-slate-800">
                    {formFile.name}{' '}
                    <span className="font-normal text-slate-500">
                      ({(formFile.size / (1024 * 1024)).toFixed(2)} MB)
                    </span>
                  </p>
                ) : editTarget ? (
                  <p className="mt-3 text-sm text-slate-500">
                    {editTarget.fileName ? `Current file: ${editTarget.fileName}. ` : ''}
                    Leave empty to keep the current file.
                  </p>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">No file selected yet</p>
                )}
              </div>
            </Field>
            {(formCategory === 'social_story' || formCategory === 'flashcard') && (
              <Field label="Text content (for stories / flashcard prompts)">
                <textarea
                  className={`${inputCls} min-h-32`}
                  placeholder="Story text or flashcard Q&A…"
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                />
              </Field>
            )}
            <div className="flex gap-2">
              <button type="submit" className={btnPrimary} disabled={formBusy}>
                {formBusy ? (editTarget ? 'Updating…' : 'Uploading…') : editTarget ? 'Update resource' : 'Save to library'}
              </button>
              {editTarget && (
                <button type="button" className={btnSecondary} onClick={closeForm}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </Card>
      )}

      {listLoading ? (
        <Spinner />
      ) : resources.length === 0 && !error ? (
        <EmptyState>
          <p className="text-4xl">📚</p>
          <p className="mt-3 font-semibold text-slate-700">No resources added yet</p>
          <p className="mt-1 text-slate-500">
            {category
              ? `No ${CATEGORY_LABELS[category].toLowerCase()} in the library. Try another category or add a new one.`
              : 'Upload your first PDF, worksheet, or therapy material to get started.'}
          </p>
          {canManage && (
            <button type="button" className={`${btnPrimary} mt-4`} onClick={startAdd}>
              + Add your first resource
            </button>
          )}
        </EmptyState>
      ) : resources.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {resources.map((r) => (
            <Card key={r.id} className="flex h-full flex-col">
              <div className="flex items-start gap-2">
                <span className="text-2xl">{CATEGORY_ICONS[r.category]}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">{r.title}</p>
                  <p className="text-xs text-slate-500">{CATEGORY_LABELS[r.category]}</p>
                </div>
              </div>
              {r.description && <p className="mt-2 line-clamp-2 text-sm text-slate-600">{r.description}</p>}
              <p className="mt-1 text-xs text-slate-400">
                {r.fileName ? `File: ${r.fileName}` : r.content ? 'Text content' : r.hasFile ? 'File attached' : 'No file'}
              </p>
              <div className="mt-auto flex flex-wrap gap-2 pt-4">
                <button
                  type="button"
                  className={btnSecondary}
                  disabled={openingId === r.id}
                  onClick={() => handleOpen(r)}
                >
                  {openingId === r.id ? 'Opening…' : 'Open'}
                </button>
                {canManage && (
                  <button type="button" className={btnPrimary} onClick={() => setAssignTarget(r)}>
                    Assign to child
                  </button>
                )}
                {canManage && (
                  <button type="button" className={btnSecondary} onClick={() => startEdit(r)}>
                    Edit
                  </button>
                )}
                {isAdmin && (
                  <button type="button" className={btnDanger} onClick={() => setDeleteTarget(r)}>
                    Delete
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      {assignTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-md">
            <h2 className="mb-3 font-bold">Assign “{assignTarget.title}”</h2>
            <Field label="Child" required>
              <select className={inputCls} value={assignChildId} onChange={(e) => setAssignChildId(e.target.value)}>
                <option value="">Select child…</option>
                {children.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Notes for family (optional)">
              <textarea className={`${inputCls} min-h-16`} value={assignNotes} onChange={(e) => setAssignNotes(e.target.value)} />
            </Field>
            <div className="mt-4 flex gap-2">
              <button type="button" className={btnPrimary} disabled={assignBusy || !assignChildId} onClick={submitAssign}>
                {assignBusy ? 'Assigning…' : 'Assign'}
              </button>
              <button type="button" className={btnSecondary} onClick={() => setAssignTarget(null)}>
                Cancel
              </button>
            </div>
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete resource"
        message={`Delete “${deleteTarget?.title}”? This removes it from the library and all child assignments.`}
        confirmLabel="Delete"
        danger
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            await deleteResource(deleteTarget.id);
            setDeleteTarget(null);
            await loadResources({ silent: true });
          } catch (err) {
            setError(errorMessage(err));
            setDeleteTarget(null);
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />

      <Card className="bg-slate-50">
        <p className="text-sm text-slate-600">
          Assigned resources appear on each child&apos;s profile under{' '}
          <Link to="/children" className="font-semibold text-primary hover:underline">
            Children → Resources
          </Link>
          .
        </p>
      </Card>
    </div>
  );
}
