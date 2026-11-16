import * as shareService from '../services/share.service.js';

const getUserId = (req) => req.user.sub;

/* Owner (behind requireAuth, mounted under /api/courses) */

/** POST /api/courses/:id/share  → turns the public link on (or returns the existing one) */
export async function enableSharing(req, res) {
  const share = await shareService.enableSharing(req.params.id, getUserId(req));
  res.json({ share });
}

/** DELETE /api/courses/:id/share  → turns the public link off */
export async function disableSharing(req, res) {
  await shareService.disableSharing(req.params.id, getUserId(req));
  res.status(204).end();
}

/* Public (no login, mounted under /api/share) */

/** GET /api/share/:token */
export async function getSharedCourse(req, res) {
  const course = await shareService.getSharedCourse(req.params.token);
  res.json({ course });
}

/** GET /api/share/:token/lessons/:lessonId */
export async function getSharedLesson(req, res) {
  const lesson = await shareService.getSharedLesson(req.params.token, req.params.lessonId);
  res.json({ lesson });
}

/** GET /api/share/:token/export  (every generated lesson, for the course PDF) */
export async function getSharedCourseExport(req, res) {
  const course = await shareService.getSharedCourseExport(req.params.token);
  res.json({ course });
}

/** POST /api/share/:token/copy  (requires login) → the new course in the visitor's library */
export async function copySharedCourse(req, res) {
  const course = await shareService.copySharedCourse(req.params.token, getUserId(req));
  res.status(201).json({ course });
}
