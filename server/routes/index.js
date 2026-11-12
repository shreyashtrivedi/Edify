/**
 * Mounts every feature router under /api.
 * Adding a feature = create routes/x.routes.js and register it here.
 */
import { Router } from 'express';
import healthRoutes from './health.routes.js';

const router = Router();

router.use('/health', healthRoutes);

export default router;
