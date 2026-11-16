import { Router } from 'express';
import {
  deleteCourse,
  exportCourse,
  generateCourse,
  getCourse,
  listCourses,
} from '../controllers/course.controller.js';
import { disableSharing, enableSharing } from '../controllers/share.controller.js';
import { generationLimiter } from '../middlewares/rateLimiter.js';
import { validate, validateObjectId } from '../middlewares/validate.js';
import { generateCourseSchema } from '../schemas/course.schemas.js';

const router = Router();

router.post('/generate', generationLimiter, validate({ body: generateCourseSchema }), generateCourse);
router.get('/', listCourses);
router.get('/:id', validateObjectId('id'), getCourse);
router.get('/:id/export', validateObjectId('id'), exportCourse);
router.delete('/:id', validateObjectId('id'), deleteCourse);

// Public read-only link (the public side lives in share.routes.js)
router.post('/:id/share', validateObjectId('id'), enableSharing);
router.delete('/:id/share', validateObjectId('id'), disableSharing);

export default router;
