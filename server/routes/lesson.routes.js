import { Router } from 'express';
import {
  generateLesson,
  generateNarration,
  getLesson,
  getNarrationAudio,
  updateProgress,
} from '../controllers/lesson.controller.js';
import { generationLimiter } from '../middlewares/rateLimiter.js';
import { validate, validateObjectId } from '../middlewares/validate.js';
import { generateLessonSchema } from '../schemas/lesson.schemas.js';
import { updateProgressSchema } from '../schemas/progress.schemas.js';

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

// Learner progress: completion + quiz answers
router.put('/:id/progress', validateObjectId('id'), validate({ body: updateProgressSchema }), updateProgress);

export default router;
