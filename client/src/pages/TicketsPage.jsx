import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { PriorityBadge, StatusBadge, statusLabel } from '../components/Badge';

const formatDate = (d) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

export function TicketsPage() {
  const { isAgent } = useAuth();
  const [filters, setFilters] = useState({ status: '', priority: '', assigned: '', q: '', page: 1 });
  const [data, setData] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Small debounce so typing in the search box doesn't fire a request per key.
    const t = setTimeout(() => {
      api.tickets(filters).then(setData).catch((e) => setError(e.message));
    }, 250);
    return () => clearTimeout(t);
  }, [filters]);

  useEffect(() => {
    if (isAgent) api.stats().then(setStats).catch(() => {});
  }, [isAgent]);

  const set = (key) => (e) => setFilters({ ...filters, [key]: e.target.value, page: 1 });

  return (
    <>
      <div className="row between">
        <h1>{isAgent ? 'Ticket queue' : 'My tickets'}</h1>
        <Link to="/tickets/new" className="button primary">New ticket</Link>
      </div>

      {stats && (
        <div className="stats">
          {Object.entries(stats.byStatus).map(([s, n]) => (
            <button key={s} className={`stat ${filters.status === s ? 'active' : ''}`}
              onClick={() => setFilters({ ...filters, status: filters.status === s ? '' : s, page: 1 })}>
              <strong>{n}</strong><span>{statusLabel(s)}</span>
            </button>
          ))}
          <div className="stat"><strong>{stats.unassigned}</strong><span>Unassigned</span></div>
        </div>
      )}

      <div className="filters">
        <input placeholder="Search titles…" value={filters.q} onChange={set('q')} aria-label="Search" />
        <select value={filters.status} onChange={set('status')} aria-label="Status">
          <option value="">Any status</option>
          {['open', 'in_progress', 'resolved', 'closed'].map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
        </select>
        <select value={filters.priority} onChange={set('priority')} aria-label="Priority">
          <option value="">Any priority</option>
          {['low', 'medium', 'high', 'urgent'].map((p) => <option key={p}>{p}</option>)}
        </select>
        {isAgent && (
          <select value={filters.assigned} onChange={set('assigned')} aria-label="Assignment">
            <option value="">Anyone</option>
            <option value="me">Assigned to me</option>
            <option value="none">Unassigned</option>
          </select>
        )}
      </div>

      {error && <div className="alert">{error}</div>}
      {!data ? <p className="muted">Loading…</p> : data.items.length === 0 ? (
        <div className="card empty">No tickets found.</div>
      ) : (
        <table className="tickets">
          <thead>
            <tr><th>Title</th><th>Status</th><th>Priority</th>{isAgent && <th>Customer</th>}<th>Assignee</th><th>Opened</th></tr>
          </thead>
          <tbody>
            {data.items.map((t) => (
              <tr key={t.id}>
                <td><Link to={`/tickets/${t.id}`}>{t.title}</Link><div className="muted small">{t.category}</div></td>
                <td><StatusBadge status={t.status} /></td>
                <td><PriorityBadge priority={t.priority} /></td>
                {isAgent && <td>{t.createdBy?.name}</td>}
                <td>{t.assignedTo?.name ?? <span className="muted">Unassigned</span>}</td>
                <td>{formatDate(t.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {data && data.pages > 1 && (
        <div className="row center pager">
          <button disabled={filters.page <= 1} onClick={() => setFilters({ ...filters, page: filters.page - 1 })}>Previous</button>
          <span className="muted">Page {data.page} of {data.pages}</span>
          <button disabled={filters.page >= data.pages} onClick={() => setFilters({ ...filters, page: filters.page + 1 })}>Next</button>
        </div>
      )}
    </>
  );
}
