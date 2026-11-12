/**
 * MongoDB connection via Mongoose.
 *
 * Production / normal dev: connects to MONGO_URI (MongoDB Atlas).
 * Dev convenience: if MONGO_URI is not set (and we're not in production), we spin up a
 * temporary in-memory MongoDB so the app runs with zero setup. Data is lost on restart.
 */
import mongoose from 'mongoose';
import { env } from './env.js';

let memoryServer = null;

export async function connectDB() {
  let uri = env.MONGO_URI;

  if (!uri) {
    // Dynamic import: this dev-only package is never loaded in production.
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    uri = memoryServer.getUri();
    console.warn(
      '⚠️  MONGO_URI not set: using a temporary in-memory MongoDB (data is lost on restart).',
    );
  }

  await mongoose.connect(uri);
  console.log(`✅ MongoDB connected (${mongoose.connection.host})`);
}

export async function disconnectDB() {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}

export function isDBConnected() {
  return mongoose.connection.readyState === 1;
}
