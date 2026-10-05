import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { connectTestDb, disconnectTestDb } from './helpers.js';

let api;
beforeAll(async () => { api = await connectTestDb(); });
afterAll(disconnectTestDb);

describe('auth', () => {
  const account = { name: 'Ali Raza', email: 'Ali@Example.com', password: 'secret-pass' };

  it('registers a customer and never returns the password hash', async () => {
    const res = await api.post('/api/auth/register').send(account).expect(201);
    expect(res.body.token).toBeTypeOf('string');
    expect(res.body.user).toMatchObject({ name: 'Ali Raza', email: 'ali@example.com', role: 'customer' });
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('ignores a role sent by the client', async () => {
    const res = await api.post('/api/auth/register')
      .send({ name: 'Sneaky', email: 'sneaky@example.com', password: 'secret-pass', role: 'agent' })
      .expect(201);
    expect(res.body.user.role).toBe('customer');
  });

  it('rejects a duplicate email with 409', async () => {
    await api.post('/api/auth/register').send(account).expect(409);
  });

  it('validates input', async () => {
    const res = await api.post('/api/auth/register').send({ name: 'A', email: 'nope', password: '123' }).expect(400);
    expect(Object.keys(res.body.details).sort()).toEqual(['email', 'name', 'password']);
  });

  it('logs in case-insensitively and returns the profile from /me', async () => {
    const login = await api.post('/api/auth/login').send({ email: 'ali@example.com', password: 'secret-pass' }).expect(200);
    const me = await api.get('/api/auth/me').set('Authorization', `Bearer ${login.body.token}`).expect(200);
    expect(me.body.user.email).toBe('ali@example.com');
  });

  it('rejects a wrong password and a bad token with 401', async () => {
    await api.post('/api/auth/login').send({ email: 'ali@example.com', password: 'wrong-pass' }).expect(401);
    await api.get('/api/auth/me').set('Authorization', 'Bearer not-a-jwt').expect(401);
    await api.get('/api/auth/me').expect(401);
  });
});
