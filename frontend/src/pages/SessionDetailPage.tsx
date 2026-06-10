import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getSession,
  deleteSession,
  listComments,
  addComment,
  updateComment,
  deleteComment,
} from '../api/sessions';
import type { Session, SessionComment } from '../api/types';
import { errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Card,
  Spinner,
  ErrorMessage,
  PageTitle,
  btnPrimary,
  btnSecondary,
  btnDanger,
  inputCls,
  ConfirmDialog,
} from '../components/ui';
import BackButton from '../components/BackButton';
import { formatDate, formatDateTime } from '../utils/format';

export default function SessionDetailPage() {
  const { childId, sessionId } = useParams<{ childId: string; sessionId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [comments, setComments] = useState<SessionComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = async () => {
    if (!sessionId) return;
    setLoading(true);
    setError('');
    try {
      const [s, cs] = await Promise.all([getSession(sessionId), listComments(sessionId)]);
      setSession(s);
      setComments(cs);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage error={error} onRetry={load} />;
  if (!session || !sessionId) return null;

  const metrics = session.structuredMetrics ?? {};
  const therapy = metrics.therapyTitle as string | undefined;
  const timeSlot = metrics.timeSlot as string | undefined;
  const metricEntries = Object.entries(metrics).filter(([k]) => k !== 'therapyTitle' && k !== 'timeSlot');
  const canEdit = user?.role === 'admin' || user?.role === 'therapist';
  const isAdmin = user?.role === 'admin';
  // Mirrors mobile app rule: a therapist cannot comment on their own session.
  const isOwnSession = user?.role === 'therapist' && (session.therapistId === user.id || session.createdBy === user.id);
  const canComment = !isOwnSession;

  const submitComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setBusy(true);
    try {
      const c = await addComment(sessionId, newComment.trim());
      setComments((prev) => [...prev, c]);
      setNewComment('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageTitle
        back={<BackButton fallback={`/children/${childId}/sessions`} />}
        actions={
          <>
            {canEdit && (
              <button
                className={btnSecondary}
                onClick={() => navigate(`/children/${childId}/sessions/${sessionId}/edit`)}
              >
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
        Session — {formatDate(session.sessionDate)}
      </PageTitle>

      <Card>
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          {therapy && (
            <div>
              <p className="text-xs text-slate-500">Therapy</p>
              <p className="font-semibold">{therapy}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-slate-500">Duration</p>
            <p className="font-semibold">{session.durationMinutes ? `${session.durationMinutes} min` : '—'}</p>
          </div>
          {timeSlot && (
            <div>
              <p className="text-xs text-slate-500">Time slot</p>
              <p className="font-semibold">{timeSlot}</p>
            </div>
          )}
          {session.therapistUser && (
            <div>
              <p className="text-xs text-slate-500">Therapist</p>
              <p className="font-semibold">
                {session.therapistUser.fullName}
                {session.therapistUser.title ? ` (${session.therapistUser.title})` : ''}
              </p>
              {session.therapistUser.mobileNumber && (
                <p className="text-xs text-slate-500">{session.therapistUser.mobileNumber}</p>
              )}
            </div>
          )}
          {session.createdByUser && (
            <div>
              <p className="text-xs text-slate-500">Logged by</p>
              <p className="font-semibold">{session.createdByUser.fullName}</p>
            </div>
          )}
        </div>
      </Card>

      {metricEntries.length > 0 && (
        <Card>
          <h2 className="mb-2 font-bold">Metrics</h2>
          <div className="flex flex-wrap gap-2">
            {metricEntries.map(([k, v]) => (
              <span key={k} className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm">
                <span className="capitalize text-slate-600">{k}</span>: <b>{String(v)}</b>
              </span>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <h2 className="mb-2 font-bold">Therapist notes</h2>
        {session.notesText ? (
          <p className="whitespace-pre-wrap text-sm text-slate-700">{session.notesText}</p>
        ) : (
          <p className="text-sm text-slate-500">No notes recorded</p>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-bold">Comments ({comments.length})</h2>
        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="rounded-lg bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">{c.user.fullName}</p>
                <span className="text-xs text-slate-400">{formatDateTime(c.createdAt)}</span>
              </div>
              {editingId === c.id ? (
                <div className="mt-2 flex gap-2">
                  <input
                    className={`${inputCls} flex-1`}
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                  />
                  <button
                    className={btnPrimary}
                    onClick={async () => {
                      try {
                        const updated = await updateComment(sessionId, c.id, editingText.trim());
                        setComments((prev) => prev.map((x) => (x.id === c.id ? updated : x)));
                        setEditingId(null);
                      } catch (err) {
                        setError(errorMessage(err));
                      }
                    }}
                  >
                    Save
                  </button>
                  <button className={btnSecondary} onClick={() => setEditingId(null)}>
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{c.comment}</p>
                  {c.userId === user?.id && (
                    <div className="mt-1 flex gap-3 text-xs">
                      <button
                        className="font-semibold text-primary hover:underline"
                        onClick={() => {
                          setEditingId(c.id);
                          setEditingText(c.comment);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="font-semibold text-red-600 hover:underline"
                        onClick={async () => {
                          try {
                            await deleteComment(sessionId, c.id);
                            setComments((prev) => prev.filter((x) => x.id !== c.id));
                          } catch (err) {
                            setError(errorMessage(err));
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
          {comments.length === 0 && <p className="text-sm text-slate-500">No comments yet</p>}
        </div>
        {canComment && (
          <form onSubmit={submitComment} className="mt-4 flex gap-2">
            <input
              className={`${inputCls} flex-1`}
              placeholder="Add a comment…"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            />
            <button type="submit" className={btnPrimary} disabled={busy || !newComment.trim()}>
              Send
            </button>
          </form>
        )}
      </Card>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete session"
        message="Are you sure you want to delete this session? This cannot be undone."
        confirmLabel="Delete"
        danger
        onConfirm={async () => {
          try {
            await deleteSession(sessionId);
            navigate(`/children/${childId}/sessions`);
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
