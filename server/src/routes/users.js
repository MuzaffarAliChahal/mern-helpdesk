import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errors.js';
import { User } from '../models/User.js';

export const usersRouter = Router();

// Agents need the list of agents to assign tickets.
usersRouter.get('/agents', requireAuth, requireRole('agent'), asyncHandler(async (_req, res) => {
  res.json(await User.find({ role: 'agent' }).sort({ name: 1 }));
}));
