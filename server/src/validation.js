import { z } from 'zod';
import { CATEGORIES, PRIORITIES, STATUSES } from './models/Ticket.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  password: z.string().min(8, 'Use at least 8 characters').max(72),
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export const createTicketSchema = z.object({
  title: z.string().trim().min(5).max(140),
  description: z.string().trim().min(10).max(8000),
  priority: z.enum(PRIORITIES).default('medium'),
  category: z.enum(CATEGORIES).default('other'),
});

export const updateTicketSchema = z
  .object({
    status: z.enum(STATUSES),
    priority: z.enum(PRIORITIES),
    assignedTo: objectId.nullable(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');

export const commentSchema = z.object({
  body: z.string().trim().min(1).max(4000),
});

export const listQuerySchema = z.object({
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  assigned: z.enum(['me', 'none']).optional(),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
