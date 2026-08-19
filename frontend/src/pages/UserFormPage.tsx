import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createUser, getUser, updateUser } from '../api/admin';
import { listChildren } from '../api/children';
import type { Child } from '../api/types';
import { errorMessage } from '../api/client';
import { Card, Field, inputCls, btnPrimary, btnSecondary, PageTitle, Spinner, ErrorMessage } from '../components/ui';
import BackButton from '../components/BackButton';

const THERAPIST_TITLES = [
  'Speech Therapist',
  'Occupational Therapist',
  'Behaviour Therapist',
  'ABA Therapist',
  'Physical Therapist',
  'Special Education Teacher',
  'Clinical Psychologist',
  'Developmental Pediatrician',
  'Counselor',
];

export default function UserFormPage() {
  const { userId } = useParams<{ userId?: string }>();
  const isEdit = Boolean(userId);
  const navigate = useNavigate();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'therapist' | 'parent'>('therapist');
  const [title, setTitle] = useState('');
  const [password, setPassword] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [showMobileToParents, setShowMobileToParents] = useState(false);
  const [childIds, setChildIds] = useState<string[]>([]);
  const [editRole, setEditRole] = useState<string>('');
  const [customTitle, setCustomTitle] = useState(false);

  useEffect(() => {
    listChildren().then(({ children: rows }) => setChildren(rows)).catch(() => {});
    if (!userId) return;
    getUser(userId)
      .then((u) => {
        setEmail(u.email);
        setFullName(u.fullName);
        setEditRole(u.role);
        setTitle(u.title ?? '');
        setCustomTitle(Boolean(u.title) && !THERAPIST_TITLES.includes(u.title ?? ''));
        setMobileNumber(u.mobileNumber ?? '');
        setShowMobileToParents(u.showMobileToParents ?? false);
        setChildIds(u.childIds ?? []);
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [userId]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (isEdit && userId) {
        await updateUser(userId, {
          fullName: fullName.trim() || undefined,
          title: title.trim() === '' ? null : title.trim(),
          password: password.trim() || undefined,
          childIds: editRole === 'parent' ? childIds : undefined,
          mobileNumber: mobileNumber.trim() === '' ? null : mobileNumber.trim(),
          showMobileToParents: editRole === 'therapist' ? showMobileToParents : undefined,
        });
        navigate('/users');
      } else {
        const res = await createUser({
          email: email.trim(),
          fullName: fullName.trim(),
          role,
          title: title.trim() || undefined,
          childIds: role === 'parent' && childIds.length > 0 ? childIds : undefined,
        });
        setInfo(res.message ?? 'User created with default password 12345678.');
        setTimeout(() => navigate('/users'), 1500);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Spinner />;

  const activeRole = isEdit ? editRole : role;

  return (
    <div>
      <PageTitle back={<BackButton fallback="/users" />}>{isEdit ? 'Edit user' : 'Add user'}</PageTitle>
      {error && <div className="mb-4"><ErrorMessage error={error} /></div>}
      {info && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{info}</div>
      )}
      <Card className="max-w-xl">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Email" required>
            <input
              type="email"
              className={inputCls}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isEdit}
              required
            />
          </Field>
          <Field label="Full name" required>
            <input className={inputCls} value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </Field>
          {!isEdit && (
            <Field label="Role" required>
              <select
                className={inputCls}
                value={role}
                onChange={(e) => setRole(e.target.value as 'therapist' | 'parent')}
              >
                <option value="therapist">Therapist</option>
                <option value="parent">Parent</option>
              </select>
            </Field>
          )}
          <Field label="Title">
            {activeRole === 'therapist' ? (
              <div className="space-y-2">
                <select
                  className={inputCls}
                  value={customTitle ? 'other' : title}
                  onChange={(e) => {
                    if (e.target.value === 'other') {
                      setCustomTitle(true);
                      setTitle('');
                    } else {
                      setCustomTitle(false);
                      setTitle(e.target.value);
                    }
                  }}
                >
                  <option value="">—</option>
                  {THERAPIST_TITLES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                  <option value="other">Other…</option>
                </select>
                {customTitle && (
                  <input
                    className={inputCls}
                    placeholder="Enter custom title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                )}
              </div>
            ) : (
              <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} />
            )}
          </Field>
          <Field label="Mobile number">
            <input className={inputCls} value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} />
          </Field>
          {isEdit && activeRole === 'therapist' && (
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={showMobileToParents}
                onChange={(e) => setShowMobileToParents(e.target.checked)}
              />
              Show mobile number to parents
            </label>
          )}
          {isEdit && (
            <Field label="Reset password (min 8 characters, optional)">
              <input
                type="password"
                className={inputCls}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
              />
            </Field>
          )}
          {activeRole === 'parent' && (
            <Field label="Assigned children">
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-slate-300 p-2">
                {children.length === 0 && <p className="text-xs text-slate-500">No children found</p>}
                {children.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={childIds.includes(c.id)}
                      onChange={(e) =>
                        setChildIds((prev) =>
                          e.target.checked ? [...prev, c.id] : prev.filter((id) => id !== c.id)
                        )
                      }
                    />
                    {c.firstName} {c.lastName}
                  </label>
                ))}
              </div>
            </Field>
          )}
          {!isEdit && (
            <p className="text-xs text-slate-500">
              New users are created with the default password <b>12345678</b> and can sign in immediately.
            </p>
          )}
          <div className="flex gap-2">
            <button type="submit" className={btnPrimary} disabled={busy}>
              {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Create user'}
            </button>
            <button type="button" className={btnSecondary} onClick={() => navigate('/users')}>
              Cancel
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
