import { Router } from 'express';
import {
  deleteCourse,
  generateCourse,
  getCourse,
  listCourses,
} from '../controllers/course.controller.js';
import { generationLimiter } from '../middlewares/rateLimiter.js';
import { validate, validateObjectId } from '../middlewares/validate.js';
import { generateCourseSchema } from '../schemas/course.schemas.js';

const router = Router();

router.post('/generate', generationLimiter, validate({ body: generateCourseSchema }), generateCourse);
router.get('/', listCourses);
router.get('/:id', validateObjectId('id'), getCourse);
router.delete('/:id', validateObjectId('id'), deleteCourse);

export default router;
