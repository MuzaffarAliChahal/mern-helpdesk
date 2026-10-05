const LABELS = { open: 'Open', in_progress: 'In progress', resolved: 'Resolved', closed: 'Closed' };

export function StatusBadge({ status }) {
  return <span className={`badge status-${status}`}>{LABELS[status] ?? status}</span>;
}

export function PriorityBadge({ priority }) {
  return <span className={`badge priority-${priority}`}>{priority}</span>;
}

export const statusLabel = (s) => LABELS[s] ?? s;
