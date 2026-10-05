import mongoose from 'mongoose';
import { createApp } from './app.js';
import { config } from './config.js';

await mongoose.connect(config.mongoUrl);
console.log('Connected to MongoDB');

const server = createApp().listen(config.port, () => console.log(`API listening on :${config.port}`));

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    server.close();
    await mongoose.disconnect();
    process.exit(0);
  });
}
