import { isDBConnected } from '../config/db.js';

/**
 * GET /api/health
 * Used by: uptime checks, Render's health check, and the frontend's "wake up the
 * server" ping (Render's free tier sleeps after ~15 min of inactivity).
 */
export function getHealth(_req, res) {
  res.json({
    status: 'ok',
    database: isDBConnected() ? 'connected' : 'disconnected',
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
}
