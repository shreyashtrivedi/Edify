import * as lessonService from '../services/lesson.service.js';
import * as narrationService from '../services/narration.service.js';

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

/** POST /api/lessons/:id/narration  (records the Hinglish narration once; later calls return it) */
export async function generateNarration(req, res) {
  const narration = await narrationService.generateNarration(req.params.id, getUserId(req));
  res.json({ narration });
}

/** GET /api/lessons/:id/narration/audio  → the MP3 bytes */
export async function getNarrationAudio(req, res) {
  const { data, mimeType } = await narrationService.getNarrationAudio(req.params.id, getUserId(req));
  res
    .type(mimeType)
    .set('Cache-Control', 'private, max-age=86400') // per user, and it never changes once recorded
    .send(data);
}
