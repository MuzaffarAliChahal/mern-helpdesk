import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api';

export function NewTicketPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', category: 'technical' });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const ticket = await api.createTicket(form);
      navigate(`/tickets/${ticket.id}`);
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : 'Could not create the ticket');
      setErrors(err.details ?? {});
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h1>New ticket</h1>
      {message && <div className="alert">{message}</div>}
      <form onSubmit={submit} noValidate>
        <label>Title<input value={form.title} onChange={set('title')} maxLength={140} placeholder="Short summary of the problem" />
          {errors.title && <small className="error">{errors.title}</small>}</label>
        <label>Description<textarea rows={6} value={form.description} onChange={set('description')}
          placeholder="What happened? What did you expect? Steps to reproduce?" />
          {errors.description && <small className="error">{errors.description}</small>}</label>
        <div className="row">
          <label>Category<select value={form.category} onChange={set('category')}>
            {['technical', 'billing', 'account', 'other'].map((c) => <option key={c}>{c}</option>)}
          </select></label>
          <label>Priority<select value={form.priority} onChange={set('priority')}>
            {['low', 'medium', 'high', 'urgent'].map((p) => <option key={p}>{p}</option>)}
          </select></label>
        </div>
        <button className="primary" disabled={busy}>{busy ? 'Submitting…' : 'Submit ticket'}</button>
      </form>
    </div>
  );
}
