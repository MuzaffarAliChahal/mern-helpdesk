import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError, request, setUnauthorizedHandler, tokenStore, toQuery } from '../api';

const respond = (status, body) =>
  vi.fn().mockResolvedValue({ ok: status < 400, status, json: () => Promise.resolve(body) });

afterEach(() => {
  vi.unstubAllGlobals();
  tokenStore.clear();
});

describe('api client', () => {
  it('builds query strings without empty values', () => {
    expect(toQuery({ status: 'open', q: '', page: 2, assigned: undefined })).toBe('?status=open&page=2');
    expect(toQuery({})).toBe('');
  });

  it('sends the bearer token and JSON body', async () => {
    const fetchMock = respond(201, { id: '1' });
    vi.stubGlobal('fetch', fetchMock);
    tokenStore.set('abc');
    await api.createTicket({ title: 'Broken' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/tickets');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer abc');
    expect(JSON.parse(init.body)).toEqual({ title: 'Broken' });
  });

  it('turns API errors into ApiError with field details', async () => {
    vi.stubGlobal('fetch', respond(400, { error: 'Validation failed', details: { title: 'Too short' } }));
    const err = await request('/tickets', { method: 'POST', body: {} }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(400);
    expect(err.details).toEqual({ title: 'Too short' });
  });

  it('calls the unauthorized handler when a stored token is rejected', async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    vi.stubGlobal('fetch', respond(401, { error: 'Invalid or expired token' }));
    tokenStore.set('expired');
    await expect(api.me()).rejects.toThrow('Invalid or expired token');
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });
});
