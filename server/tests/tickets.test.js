import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { connectTestDb, disconnectTestDb, makeUser } from './helpers.js';

let api, alice, bob, agent;
const newTicket = (title, extra = {}) => ({ title, description: 'Something is not working as expected.', ...extra });

beforeAll(async () => {
  api = await connectTestDb();
  alice = await makeUser('customer', 'Alice');
  bob = await makeUser('customer', 'Bob');
  agent = await makeUser('agent', 'Sara Agent');
});
afterAll(disconnectTestDb);

describe('tickets', () => {
  let aliceTicket;

  it('creates a ticket with defaults', async () => {
    const res = await api.post('/api/tickets').set(alice.auth).send(newTicket('Cannot log in on mobile')).expect(201);
    aliceTicket = res.body;
    expect(res.body).toMatchObject({ status: 'open', priority: 'medium', category: 'other', assignedTo: null });
    expect(res.body.createdBy.name).toBe('Alice');
  });

  it('requires a token', async () => {
    await api.get('/api/tickets').expect(401);
  });

  it('shows customers only their own tickets', async () => {
    await api.post('/api/tickets').set(bob.auth).send(newTicket('Invoice is missing', { priority: 'high' })).expect(201);
    const mine = await api.get('/api/tickets').set(alice.auth).expect(200);
    expect(mine.body.items.map((t) => t.title)).toEqual(['Cannot log in on mobile']);
    await api.get(`/api/tickets/${aliceTicket.id}`).set(bob.auth).expect(404);
  });

  it('lets agents see, filter and search the whole queue', async () => {
    const all = await api.get('/api/tickets').set(agent.auth).expect(200);
    expect(all.body.total).toBe(2);
    const high = await api.get('/api/tickets?priority=high').set(agent.auth).expect(200);
    expect(high.body.items).toHaveLength(1);
    const search = await api.get('/api/tickets?q=LOG IN').set(agent.auth).expect(200);
    expect(search.body.items[0].id).toBe(aliceTicket.id);
    const regexSafe = await api.get('/api/tickets?q=.*').set(agent.auth).expect(200);
    expect(regexSafe.body.total).toBe(0);
  });

  it('paginates', async () => {
    const res = await api.get('/api/tickets?limit=1&page=2').set(agent.auth).expect(200);
    expect(res.body).toMatchObject({ total: 2, page: 2, pages: 2 });
    expect(res.body.items).toHaveLength(1);
  });

  it('lets agents assign and change status, but only to agents', async () => {
    await api.patch(`/api/tickets/${aliceTicket.id}`).set(agent.auth).send({ assignedTo: bob.user.id }).expect(400);
    const res = await api.patch(`/api/tickets/${aliceTicket.id}`).set(agent.auth)
      .send({ assignedTo: agent.user.id, status: 'in_progress' }).expect(200);
    expect(res.body.assignedTo.name).toBe('Sara Agent');
    const mine = await api.get('/api/tickets?assigned=me').set(agent.auth).expect(200);
    expect(mine.body.total).toBe(1);
  });

  it('stops customers from changing priority or assignment', async () => {
    await api.patch(`/api/tickets/${aliceTicket.id}`).set(alice.auth).send({ priority: 'urgent' }).expect(403);
  });

  it('keeps a conversation and reopens when the customer replies to a resolved ticket', async () => {
    await api.post(`/api/tickets/${aliceTicket.id}/comments`).set(agent.auth).send({ body: 'Please update the app.' }).expect(201);
    await api.patch(`/api/tickets/${aliceTicket.id}`).set(agent.auth).send({ status: 'resolved' }).expect(200);
    const reply = await api.post(`/api/tickets/${aliceTicket.id}/comments`).set(alice.auth).send({ body: 'Still broken.' }).expect(201);
    expect(reply.body.author.name).toBe('Alice');

    const ticket = await api.get(`/api/tickets/${aliceTicket.id}`).set(alice.auth).expect(200);
    expect(ticket.body.status).toBe('open');
    expect(ticket.body.comments.map((c) => c.author.role)).toEqual(['agent', 'customer']);
  });

  it('lets the customer close their ticket, then blocks new comments', async () => {
    await api.patch(`/api/tickets/${aliceTicket.id}`).set(alice.auth).send({ status: 'closed' }).expect(200);
    await api.post(`/api/tickets/${aliceTicket.id}/comments`).set(alice.auth).send({ body: 'One more thing' }).expect(409);
  });

  it('reports queue stats to agents only', async () => {
    await api.get('/api/tickets/stats').set(alice.auth).expect(403);
    const res = await api.get('/api/tickets/stats').set(agent.auth).expect(200);
    expect(res.body.byStatus).toEqual({ open: 1, in_progress: 0, resolved: 0, closed: 1 });
    expect(res.body.unassigned).toBe(1);
  });

  it('returns 404 for unknown or malformed ids and 400 for bad input', async () => {
    await api.get('/api/tickets/66f000000000000000000000').set(agent.auth).expect(404);
    await api.get('/api/tickets/not-an-id').set(agent.auth).expect(404);
    await api.post('/api/tickets').set(alice.auth).send({ title: 'Hi', description: 'short' }).expect(400);
  });

  it('lists agents for assignment', async () => {
    const res = await api.get('/api/users/agents').set(agent.auth).expect(200);
    expect(res.body.map((u) => u.name)).toEqual(['Sara Agent']);
    await api.get('/api/users/agents').set(alice.auth).expect(403);
  });
});
