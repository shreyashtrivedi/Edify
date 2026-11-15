/**
 * Ownership checks shared by several services (lessons, narration, progress).
 *
 * Kept in its own module so those services can depend on it without depending on each
 * other (lesson.service ↔ progress.service would otherwise be a circular import).
 */
import { Course } from '../models/Course.js';
import { Lesson } from '../models/Lesson.js';
import { ApiError } from '../utils/ApiError.js';

/** Loads a lesson and checks that its course belongs to the user (404 otherwise). */
export async function findOwnedLesson(lessonId, creator) {
  const lesson = await Lesson.findById(lessonId);
  if (!lesson) throw ApiError.notFound('Lesson not found');

  const course = await Course.findOne({ _id: lesson.course, creator }).select('title level').lean();
  if (!course) throw ApiError.notFound('Lesson not found');

  return { lesson, course };
}
