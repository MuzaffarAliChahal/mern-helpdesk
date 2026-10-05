import { Router } from 'express';
import { requireAuth, signToken } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../middleware/errors.js';
import { User } from '../models/User.js';
import { loginSchema, registerSchema } from '../validation.js';

export const authRouter = Router();

authRouter.post('/register', asyncHandler(async (req, res) => {
  const { name, email, password } = registerSchema.parse(req.body);
  if (await User.exists({ email: email.toLowerCase() })) throw new HttpError(409, 'Email is already registered');
  // Self sign-up always creates customers; agents are created by an admin or the seed script.
  const user = await User.create({ name, email, passwordHash: await User.hashPassword(password) });
  res.status(201).json({ token: signToken(user), user });
}));

authRouter.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  if (!user || !(await user.checkPassword(password))) throw new HttpError(401, 'Wrong email or password');
  res.json({ token: signToken(user), user });
}));

authRouter.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new HttpError(401, 'User no longer exists');
  res.json({ user });
}));
