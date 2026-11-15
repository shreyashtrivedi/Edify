/**
 * Course controllers: translate HTTP requests into service calls and send responses.
 * Errors thrown here (or in services) are handled by middlewares/errorHandler.js.
 */
import * as courseService from '../services/course.service.js';

// requireAuth has verified the token, so req.user.sub is the logged-in user's Auth0 id.
const getUserId = (req) => req.user.sub;

/** POST /api/courses/generate   body: { prompt, level?, moduleCount? } */
export async function generateCourse(req, res) {
  const { prompt, level, moduleCount } = req.body;
  const course = await courseService.generateCourse({
    prompt,
    level,
    moduleCount,
    creator: getUserId(req),
  });
  res.status(201).json({ course });
}

/** GET /api/courses */
export async function listCourses(req, res) {
  const courses = await courseService.listCoursesForUser(getUserId(req));
  res.json({ courses });
}

/** GET /api/courses/:id */
export async function getCourse(req, res) {
  const course = await courseService.getCourseForUser(req.params.id, getUserId(req));
  res.json({ course });
}

/** GET /api/courses/:id/export  (full content of every generated lesson, for the PDF) */
export async function exportCourse(req, res) {
  const course = await courseService.getCourseExportForUser(req.params.id, getUserId(req));
  res.json({ course });
}

/** DELETE /api/courses/:id */
export async function deleteCourse(req, res) {
  await courseService.deleteCourseForUser(req.params.id, getUserId(req));
  res.status(204).end();
}
