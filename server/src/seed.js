// Creates demo accounts and a few tickets. Safe to run more than once.
import mongoose from 'mongoose';
import { config } from './config.js';
import { Ticket } from './models/Ticket.js';
import { User } from './models/User.js';

const PASSWORD = 'password123';

async function upsertUser(name, email, role) {
  const passwordHash = await User.hashPassword(PASSWORD);
  await User.updateOne({ email }, { name, email, role, passwordHash }, { upsert: true });
  return User.findOne({ email });
}

await mongoose.connect(config.mongoUrl);
const agent = await upsertUser('Sara (Support)', 'agent@example.com', 'agent');
const customer = await upsertUser('Ali Customer', 'customer@example.com', 'customer');

if ((await Ticket.countDocuments()) === 0) {
  await Ticket.create([
    { title: 'Charged twice for October invoice', description: 'My card shows two charges of $49 on 2 October.', priority: 'high', category: 'billing', createdBy: customer._id },
    { title: 'Cannot reset my password', description: 'The reset email never arrives, I checked spam too.', priority: 'medium', category: 'account', createdBy: customer._id, assignedTo: agent._id, status: 'in_progress', comments: [{ author: agent._id, body: 'Thanks, I am checking the mail logs now.' }] },
    { title: 'Export to CSV times out', description: 'Exporting more than 5,000 rows fails after 30 seconds.', priority: 'urgent', category: 'technical', createdBy: customer._id },
  ]);
}

console.log(`Seeded. Log in as agent@example.com or customer@example.com with "${PASSWORD}".`);
await mongoose.disconnect();
