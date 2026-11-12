/**
 * Application entry point:  validate env → connect to MongoDB → start HTTP server.
 */
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { createApp } from './app.js';

try {
  await connectDB();
} catch (error) {
  console.error('❌ Could not connect to MongoDB:', error.message);
  process.exit(1);
}

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`🚀 Edify API running on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

// Graceful shutdown: stop accepting requests, close the DB connection, then exit.
async function shutdown(signal) {
  console.log(`\n${signal} received, shutting down...`);
  server.close();
  await disconnectDB();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
