import { Router } from 'express';
import {
  copySharedCourse,
  getSharedCourse,
  getSharedCourseExport,
  getSharedLesson,
} from '../controllers/share.controller.js';
import { copyLimiter, publicLimiter } from '../middlewares/rateLimiter.js';
import { validateObjectId } from '../middlewares/validate.js';

/**
 * Public share links. Mounted WITHOUT requireAuth (anyone with the link can read), except
 * "save a copy", which needs a login to know whose library the copy goes into.
 */
export function createShareRouter({ requireAuth }) {
  const router = Router();

  router.use(publicLimiter);
  router.use((_req, res, next) => {
    res.set({
      'Cache-Control': 'no-store', // a link that was turned off must stop working at once, even from caches
      'X-Robots-Tag': 'noindex', // shared courses are for people with the link, not search engines
    });
    next();
  });

  router.get('/:token', getSharedCourse);
  router.get('/:token/export', getSharedCourseExport);
  router.get('/:token/lessons/:lessonId', validateObjectId('lessonId'), getSharedLesson);
  router.post('/:token/copy', requireAuth, copyLimiter, copySharedCourse);

  return router;
}
