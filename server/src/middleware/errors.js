import mongoose from 'mongoose';
import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function notFound(_req, _res, next) {
  next(new HttpError(404, 'Not found'));
}

// One JSON error shape for the whole API: { error, details? }
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    const details = Object.fromEntries(err.issues.map((i) => [i.path.join('.') || '_', i.message]));
    return res.status(400).json({ error: 'Validation failed', details });
  }
  if (err instanceof mongoose.Error.CastError) {
    return res.status(404).json({ error: 'Not found' });
  }
  if (err?.code === 11000) {
    return res.status(409).json({ error: 'Already exists' });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, ...(err.details && { details: err.details }) });
  }
  console.error(err);
  return res.status(500).json({ error: 'Internal server error' });
}
