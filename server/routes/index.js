/**
 * Mounts every feature router under /api.
 * Adding a feature = create routes/x.routes.js and register it here.
 *
 * /health is public (used by uptime checks and the status dot in the UI).
 * Everything else sits behind requireAuth, so a valid login is needed.
 */
import { Router } from 'express';
import courseRoutes from './course.routes.js';
import healthRoutes from './health.routes.js';
import lessonRoutes from './lesson.routes.js';
import userRoutes from './user.routes.js';

export function createApiRouter({ requireAuth }) {
  const router = Router();

  router.use('/health', healthRoutes);

  router.use('/courses', requireAuth, courseRoutes);
  router.use('/lessons', requireAuth, lessonRoutes);
  router.use('/users', requireAuth, userRoutes);

  return router;
}
