import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { PriorityBadge, StatusBadge, statusLabel } from '../components/Badge';

const formatTime = (d) => new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export function TicketPage() {
  const { id } = useParams();
  const { isAgent } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [agents, setAgents] = useState([]);
  const [reply, setReply] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    api.ticket(id).then(setTicket).catch((e) => setError(e.message));
    if (isAgent) api.agents().then(setAgents).catch(() => {});
  }, [id, isAgent]);

  async function update(changes) {
    try {
      const updated = await api.updateTicket(id, changes);
      setTicket((t) => ({ ...t, ...updated, comments: t.comments }));
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }

  async function sendReply(e) {
    e.preventDefault();
    if (!reply.trim()) return;
    try {
      await api.addComment(id, reply);
      setReply('');
      setTicket(await api.ticket(id)); // status may change after a reply
    } catch (err) {
      setError(err.message);
    }
  }

  if (error && !ticket) return <div className="alert">{error} <Link to="/">Back to tickets</Link></div>;
  if (!ticket) return <p className="muted">Loading…</p>;

  return (
    <div className="ticket">
      <Link to="/" className="muted">← All tickets</Link>
      <div className="row between">
        <h1>{ticket.title}</h1>
        <div className="row"><StatusBadge status={ticket.status} /><PriorityBadge priority={ticket.priority} /></div>
      </div>
      <p className="muted">Opened by {ticket.createdBy.name} · {formatTime(ticket.createdAt)} · {ticket.category}</p>
      {error && <div className="alert">{error}</div>}

      <div className="grid">
        <section>
          <div className="card message"><p>{ticket.description}</p></div>
          {ticket.comments.map((c) => (
            <div key={c.id} className={`card message ${c.author.role === 'agent' ? 'agent' : ''}`}>
              <div className="muted small">{c.author.name} · {c.author.role} · {formatTime(c.createdAt)}</div>
              <p>{c.body}</p>
            </div>
          ))}
          {ticket.status !== 'closed' ? (
            <form className="card" onSubmit={sendReply}>
              <label>Reply<textarea rows={3} value={reply} onChange={(e) => setReply(e.target.value)} /></label>
              <button className="primary" disabled={!reply.trim()}>Send reply</button>
            </form>
          ) : <p className="muted">This ticket is closed.</p>}
        </section>

        <aside className="card">
          {isAgent ? (
            <>
              <label>Status<select value={ticket.status} onChange={(e) => update({ status: e.target.value })}>
                {['open', 'in_progress', 'resolved', 'closed'].map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
              </select></label>
              <label>Priority<select value={ticket.priority} onChange={(e) => update({ priority: e.target.value })}>
                {['low', 'medium', 'high', 'urgent'].map((p) => <option key={p}>{p}</option>)}
              </select></label>
              <label>Assignee<select value={ticket.assignedTo?.id ?? ''} onChange={(e) => update({ assignedTo: e.target.value || null })}>
                <option value="">Unassigned</option>
                {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select></label>
            </>
          ) : (
            <>
              <p><strong>Assignee:</strong> {ticket.assignedTo?.name ?? 'Waiting for an agent'}</p>
              {ticket.status !== 'closed' && (
                <button onClick={() => update({ status: 'closed' })}>Close ticket</button>
              )}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
