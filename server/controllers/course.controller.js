/**
 * Course controllers: translate HTTP requests into service calls and send responses.
 * Errors thrown here (or in services) are handled by middlewares/errorHandler.js.
 */
import * as courseService from '../services/course.service.js';

// Until authentication is added (Milestone 4), every course belongs to one shared user.
const getUserId = (req) => req.user?.sub ?? 'anonymous';

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

/** DELETE /api/courses/:id */
export async function deleteCourse(req, res) {
  await courseService.deleteCourseForUser(req.params.id, getUserId(req));
  res.status(204).end();
}
