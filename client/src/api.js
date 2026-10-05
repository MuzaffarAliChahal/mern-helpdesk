const TOKEN_KEY = 'helpdesk.token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(status, message, details = {}) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

export async function request(path, { method = 'GET', body } = {}) {
  const headers = { Accept: 'application/json' };
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`/api${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = res.status === 204 ? null : await res.json().catch(() => null);

  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized();
    throw new ApiError(res.status, data?.error ?? `Request failed (${res.status})`, data?.details);
  }
  return data;
}

export const toQuery = (params) => {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null));
  const s = q.toString();
  return s ? `?${s}` : '';
};

export const api = {
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  register: (name, email, password) => request('/auth/register', { method: 'POST', body: { name, email, password } }),
  me: () => request('/auth/me'),
  tickets: (params = {}) => request(`/tickets${toQuery(params)}`),
  ticket: (id) => request(`/tickets/${id}`),
  createTicket: (data) => request('/tickets', { method: 'POST', body: data }),
  updateTicket: (id, data) => request(`/tickets/${id}`, { method: 'PATCH', body: data }),
  addComment: (id, body) => request(`/tickets/${id}/comments`, { method: 'POST', body: { body } }),
  stats: () => request('/tickets/stats'),
  agents: () => request('/users/agents'),
};
