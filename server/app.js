/**
 * Builds the Express app (middleware + routes) WITHOUT starting it.
 *
 * Keeping this separate from server.js lets tests import the app and send
 * requests to it with supertest, without opening a real port or database.
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import apiRoutes from './routes/index.js';
import { errorHandler, notFound } from './middlewares/errorHandler.js';

export function createApp() {
  const app = express();

  // Render/Vercel sit behind a proxy; this makes req.ip the real client IP (needed for rate limiting).
  app.set('trust proxy', 1);

  app.use(helmet()); // secure HTTP headers
  app.use(cors({ origin: env.clientOrigins })); // only our frontend may call the API from a browser
  app.use(express.json({ limit: '100kb' })); // parse JSON bodies, reject huge payloads
  if (!env.isTest) app.use(morgan(env.isProduction ? 'combined' : 'dev')); // request logging

  app.get('/', (_req, res) => {
    res.json({ name: 'Edify API', status: 'running', health: '/api/health' });
  });

  app.use('/api', apiRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
