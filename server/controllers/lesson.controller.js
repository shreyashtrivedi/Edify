import * as lessonService from '../services/lesson.service.js';

// requireAuth has verified the token, so req.user.sub is the logged-in user's Auth0 id.
const getUserId = (req) => req.user.sub;

/** GET /api/lessons/:id  (content may be empty if not generated yet: see isEnriched) */
export async function getLesson(req, res) {
  const lesson = await lessonService.getLessonForUser(req.params.id, getUserId(req));
  res.json({ lesson });
}

/** POST /api/lessons/:id/generate   body: { force?: boolean } */
export async function generateLesson(req, res) {
  const lesson = await lessonService.generateLessonContent(req.params.id, getUserId(req), {
    force: req.body.force,
  });
  res.json({ lesson });
}
