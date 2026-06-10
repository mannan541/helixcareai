import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import * as authApi from '../api/auth';
import { errorMessage } from '../api/client';
import { Field, inputCls, btnPrimary, ErrorMessage } from '../components/ui';

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('parent');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setBusy(true);
    try {
      const res = await authApi.register({ email: email.trim(), password, fullName: fullName.trim(), role });
      setSuccess(res.message ?? 'Account created. An admin must approve your account before you can sign in.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 text-center">
          <div className="text-4xl">🩺</div>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Create account</h1>
          <p className="mt-1 text-sm text-slate-500">Join HelixCareAI</p>
        </div>
        {success ? (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            <p>{success}</p>
            <Link to="/login" className="mt-2 inline-block font-semibold underline">
              Go to sign in
            </Link>
          </div>
        ) : (
          <>
            {error && <div className="mb-4"><ErrorMessage error={error} /></div>}
            <form onSubmit={submit} className="space-y-4">
              <Field label="Full name" required>
                <input className={inputCls} value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </Field>
              <Field label="Email" required>
                <input type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} required />
              </Field>
              <Field label="Password (min 8 characters)" required>
                <input
                  type="password"
                  className={inputCls}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </Field>
              <Field label="Role" required>
                <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="parent">Parent</option>
                  <option value="therapist">Therapist</option>
                </select>
              </Field>
              <button type="submit" className={`${btnPrimary} w-full`} disabled={busy}>
                {busy ? 'Creating…' : 'Create account'}
              </button>
            </form>
            <p className="mt-4 text-center text-sm text-slate-600">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
