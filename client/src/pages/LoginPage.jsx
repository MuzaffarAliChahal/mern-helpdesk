import { useState } from 'react';
import { ApiError } from '../api';
import { useAuth } from '../auth';

export function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFieldErrors({});
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await register(form.name, form.email, form.password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Cannot reach the server');
      setFieldErrors(err.details ?? {});
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card narrow">
      <h1>{mode === 'login' ? 'Sign in' : 'Create an account'}</h1>
      <p className="muted">Customers raise tickets. Agents work the queue.</p>
      {error && <div className="alert" role="alert">{error}</div>}
      <form onSubmit={submit} noValidate>
        {mode === 'register' && (
          <label>Name<input value={form.name} onChange={set('name')} autoComplete="name" />
            {fieldErrors.name && <small className="error">{fieldErrors.name}</small>}</label>
        )}
        <label>Email<input type="email" value={form.email} onChange={set('email')} autoComplete="email" />
          {fieldErrors.email && <small className="error">{fieldErrors.email}</small>}</label>
        <label>Password<input type="password" value={form.password} onChange={set('password')}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
          {fieldErrors.password && <small className="error">{fieldErrors.password}</small>}</label>
        <button className="primary" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
      </form>
      <button className="link" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
        {mode === 'login' ? 'New here? Create an account' : 'Have an account? Sign in'}
      </button>
      <p className="hint">Demo (after <code>npm run seed</code>): agent@example.com or customer@example.com, password <code>password123</code></p>
    </div>
  );
}
