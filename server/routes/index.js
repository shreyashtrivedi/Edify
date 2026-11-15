/**
 * Mounts every feature router under /api.
 * Adding a feature = create routes/x.routes.js and register it here.
 */
import { Router } from 'express';
import courseRoutes from './course.routes.js';
import healthRoutes from './health.routes.js';
import lessonRoutes from './lesson.routes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/courses', courseRoutes);
router.use('/lessons', lessonRoutes);

export default router;
