import { useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import * as authApi from '../api/auth';
import { errorMessage } from '../api/client';
import { Card, Field, inputCls, btnPrimary, PageTitle, ErrorMessage } from '../components/ui';
import BackButton from '../components/BackButton';

export default function EditProfilePage() {
  const { user, refreshUser } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [mobileNumber, setMobileNumber] = useState(user?.mobileNumber ?? '');
  const [showMobileToParents, setShowMobileToParents] = useState(user?.showMobileToParents ?? false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (password && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password && password.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }
    setBusy(true);
    try {
      await authApi.updateProfile({
        fullName: fullName.trim() || undefined,
        password: password || undefined,
        currentPassword: password ? currentPassword : undefined,
        mobileNumber: mobileNumber.trim() === '' ? null : mobileNumber.trim(),
        showMobileToParents: user.role === 'therapist' ? showMobileToParents : undefined,
      });
      await refreshUser();
      setSuccess('Profile updated');
      setCurrentPassword('');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageTitle back={<BackButton />}>Edit profile</PageTitle>
      <Card className="max-w-xl">
        {error && <div className="mb-4"><ErrorMessage error={error} /></div>}
        {success && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            {success}
          </div>
        )}
        <form onSubmit={submit} className="space-y-4">
          <Field label="Email">
            <input className={inputCls} value={user.email} disabled />
          </Field>
          <Field label="Full name">
            <input className={inputCls} value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </Field>
          <Field label="Mobile number">
            <input className={inputCls} value={mobileNumber ?? ''} onChange={(e) => setMobileNumber(e.target.value)} />
          </Field>
          {user.role === 'therapist' && (
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={showMobileToParents}
                onChange={(e) => setShowMobileToParents(e.target.checked)}
              />
              Show my mobile number to parents
            </label>
          )}

          <hr className="border-slate-200" />
          <h3 className="text-sm font-semibold text-slate-900">Change password</h3>
          {user.role !== 'admin' && (
            <Field label="Current password">
              <input
                type="password"
                className={inputCls}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
            </Field>
          )}
          <Field label="New password (min 8 characters)">
            <input
              type="password"
              className={inputCls}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </Field>
          <Field label="Confirm new password">
            <input
              type="password"
              className={inputCls}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </Field>

          <button type="submit" className={btnPrimary} disabled={busy}>
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </Card>
    </div>
  );
}
