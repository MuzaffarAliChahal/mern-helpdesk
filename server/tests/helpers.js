import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { signToken } from '../src/middleware/auth.js';
import { User } from '../src/models/User.js';

let memoryServer;

// Uses MONGO_URL when set (CI runs a mongo service), otherwise an in-memory MongoDB.
export async function connectTestDb() {
  let base = process.env.MONGO_URL;
  if (!base) {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    base = memoryServer.getUri();
  }
  const url = new URL(base);
  url.pathname = `/helpdesk_test_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  await mongoose.connect(url.toString());
  return request(createApp());
}

export async function disconnectTestDb() {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await memoryServer?.stop();
}

export async function makeUser(role = 'customer', name = role) {
  const user = await User.create({
    name,
    email: `${name.replace(/\s/g, '').toLowerCase()}_${Math.random().toString(36).slice(2, 8)}@example.com`,
    role,
    passwordHash: await User.hashPassword('password123'),
  });
  return { user, auth: { Authorization: `Bearer ${signToken(user)}` } };
}
