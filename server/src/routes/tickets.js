import { Router } from 'express';
import mongoose from 'mongoose';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../middleware/errors.js';
import { STATUSES, Ticket } from '../models/Ticket.js';
import { User } from '../models/User.js';
import { commentSchema, createTicketSchema, listQuerySchema, updateTicketSchema } from '../validation.js';

export const ticketsRouter = Router();
ticketsRouter.use(requireAuth);

const isAgent = (req) => req.user.role === 'agent';
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const people = [
  { path: 'createdBy', select: 'name email' },
  { path: 'assignedTo', select: 'name email' },
];

async function loadTicket(req) {
  const ticket = await Ticket.findById(req.params.id).populate([...people, { path: 'comments.author', select: 'name role' }]);
  // Customers get 404 (not 403) for other people's tickets so ids can't be probed.
  if (!ticket || (!isAgent(req) && ticket.createdBy._id.toString() !== req.user.id)) {
    throw new HttpError(404, 'Ticket not found');
  }
  return ticket;
}

ticketsRouter.get('/', asyncHandler(async (req, res) => {
  const { status, priority, assigned, q, page, limit } = listQuerySchema.parse(req.query);
  const filter = isAgent(req) ? {} : { createdBy: req.user.id };
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (assigned === 'me') filter.assignedTo = req.user.id;
  if (assigned === 'none') filter.assignedTo = null;
  if (q) filter.title = { $regex: escapeRegex(q), $options: 'i' };

  const [items, total] = await Promise.all([
    Ticket.find(filter).select('-comments').populate(people).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Ticket.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
}));

ticketsRouter.post('/', asyncHandler(async (req, res) => {
  const data = createTicketSchema.parse(req.body);
  const ticket = await Ticket.create({ ...data, createdBy: req.user.id });
  res.status(201).json(await ticket.populate(people));
}));

ticketsRouter.get('/stats', requireRole('agent'), asyncHandler(async (_req, res) => {
  const rows = await Ticket.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  for (const r of rows) byStatus[r._id] = r.count;
  const unassigned = await Ticket.countDocuments({ assignedTo: null, status: { $in: ['open', 'in_progress'] } });
  res.json({ byStatus, unassigned });
}));

ticketsRouter.get('/:id', asyncHandler(async (req, res) => {
  res.json(await loadTicket(req));
}));

ticketsRouter.patch('/:id', asyncHandler(async (req, res) => {
  const changes = updateTicketSchema.parse(req.body);
  const ticket = await loadTicket(req);

  if (!isAgent(req)) {
    // Customers can only close their own ticket.
    const onlyClosing = Object.keys(changes).length === 1 && changes.status === 'closed';
    if (!onlyClosing) throw new HttpError(403, 'Only agents can change this');
  }
  if (changes.assignedTo) {
    const agent = await User.findOne({ _id: changes.assignedTo, role: 'agent' });
    if (!agent) throw new HttpError(400, 'Validation failed', { assignedTo: 'Must be an agent' });
  }

  Object.assign(ticket, changes);
  await ticket.save();
  res.json(await ticket.populate(people));
}));

ticketsRouter.post('/:id/comments', asyncHandler(async (req, res) => {
  const { body } = commentSchema.parse(req.body);
  const ticket = await loadTicket(req);
  if (ticket.status === 'closed') throw new HttpError(409, 'Ticket is closed');

  ticket.comments.push({ author: new mongoose.Types.ObjectId(req.user.id), body });
  if (!isAgent(req) && ticket.status === 'resolved') ticket.status = 'open'; // customer replied, reopen
  if (isAgent(req) && ticket.status === 'open') ticket.status = 'in_progress';
  await ticket.save();
  await ticket.populate({ path: 'comments.author', select: 'name role' });
  res.status(201).json(ticket.comments.at(-1));
}));
