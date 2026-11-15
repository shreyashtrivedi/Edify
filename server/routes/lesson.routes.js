import { Router } from 'express';
import {
  generateLesson,
  generateNarration,
  getLesson,
  getNarrationAudio,
} from '../controllers/lesson.controller.js';
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

// Hinglish narration: AI script + text-to-speech, so it shares the AI rate limit
router.post('/:id/narration', validateObjectId('id'), generationLimiter, generateNarration);
router.get('/:id/narration/audio', validateObjectId('id'), getNarrationAudio);

export default router;
