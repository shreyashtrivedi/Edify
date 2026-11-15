import { Router } from 'express';
import { generateLesson, getLesson } from '../controllers/lesson.controller.js';
import { generationLimiter } from '../middlewares/rateLimiter.js';
import { validate, validateObjectId } from '../middlewares/validate.js';
import { generateLessonSchema } from '../schemas/lesson.schemas.js';

const router = Router();

router.get('/:id', validateObjectId('id'), getLesson);
router.post(
  '/:id/generate',
  validateObjectId('id'),
  generationLimiter,
  validate({ body: generateLessonSchema }),
  generateLesson,
);

export default router;
