/**
 * Share links: a public, read-only view of a course at /share/<token>.
 *
 * - The token is 128 random bits (22 URL-safe characters). Nobody can guess one, so only
 *   people the owner gave the link to can open the course. No login needed to read.
 * - Visitors can read lessons that already exist, but never trigger AI generation:
 *   that would spend the owner's quota.
 * - Public responses contain only course material: never the owner's id or their prompt.
 * - A logged-in visitor can "save a copy": the course is duplicated into their own library,
 *   where progress, the tutor and narration all work like on their own courses.
 */
import { randomBytes } from 'node:crypto';
import { Course } from '../models/Course.js';
import { Lesson } from '../models/Lesson.js';
import { Module } from '../models/Module.js';
import { ApiError } from '../utils/ApiError.js';
import { deleteCourseTree, findCourseExport, getCourseForUser } from './course.service.js';

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{22}$/;
const LESSON_CONTENT_FIELDS = 'title order isEnriched objectives keyTopics content resources';

/** 16 random bytes = 128 bits, written as 22 URL-safe characters. */
export const newShareToken = () => randomBytes(16).toString('base64url');

const shareNotFound = () =>
  ApiError.notFound('This share link is invalid or has been turned off.', { code: 'SHARE_NOT_FOUND' });

const toShareView = (course) => ({ token: course.shareToken ?? null, sharedAt: course.sharedAt ?? null });

/* ---------- Owner: turn sharing on / off ---------- */

/** Turns sharing on (or returns the existing link if it is already on). */
export async function enableSharing(courseId, creator) {
  // Atomic "set a token only if there isn't one yet": two quick clicks can't create two
  // different tokens where the first one handed out silently stops working.
  const updated = await Course.findOneAndUpdate(
    { _id: courseId, creator, shareToken: { $exists: false } },
    { $set: { shareToken: newShareToken(), sharedAt: new Date() } },
    { returnDocument: 'after' },
  )
    .select('shareToken sharedAt')
    .lean();

  const course = updated ?? (await Course.findOne({ _id: courseId, creator }).select('shareToken sharedAt').lean());
  if (!course) throw ApiError.notFound('Course not found');
  return toShareView(course);
}

/** Turns sharing off: the link stops working immediately. */
export async function disableSharing(courseId, creator) {
  const result = await Course.updateOne({ _id: courseId, creator }, { $unset: { shareToken: 1, sharedAt: 1 } });
  if (result.matchedCount === 0) throw ApiError.notFound('Course not found');
}

/* ---------- Public: read a shared course ---------- */

/** 404 for tokens that can't be real, without querying the database for junk. */
function checkTokenFormat(token) {
  if (!TOKEN_PATTERN.test(token)) throw shareNotFound();
}

/** The shared course's _id, or a 404 for unknown / turned-off links. */
async function findSharedCourseId(token) {
  checkTokenFormat(token);
  const course = await Course.findOne({ shareToken: token }).select('_id').lean();
  if (!course) throw shareNotFound();
  return course._id;
}

/** Outline of a shared course: modules and lesson titles (no owner details). */
export async function getSharedCourse(token) {
  checkTokenFormat(token);
  const course = await Course.findOne({ shareToken: token })
    .select('title description tags level modules createdAt')
    .populate({
      path: 'modules',
      select: 'title description order lessons',
      populate: { path: 'lessons', select: 'title order isEnriched' },
    })
    .lean();
  if (!course) throw shareNotFound();
  return course;
}

/** One lesson of a shared course. Lessons the owner never opened come back with no content. */
export async function getSharedLesson(token, lessonId) {
  const courseId = await findSharedCourseId(token);
  const lesson = await Lesson.findOne({ _id: lessonId, course: courseId }).select(LESSON_CONTENT_FIELDS).lean();
  if (!lesson) throw ApiError.notFound('Lesson not found');
  return lesson;
}

/** Every lesson's content in one request (for the course PDF). */
export async function getSharedCourseExport(token) {
  checkTokenFormat(token);
  const course = await findCourseExport({ shareToken: token });
  if (!course) throw shareNotFound();
  return course;
}

/* ---------- Logged-in visitor: save a copy ---------- */

/**
 * Duplicates a shared course (outline + every generated lesson) into `user`'s library.
 * Like saveCourseOutline: all ids are created in memory first, then 3 writes; if a write
 * fails, everything created so far is deleted.
 * Not copied: the owner's progress, tutor chats and narration audio (those belong to them).
 */
export async function copySharedCourse(token, user) {
  const sourceId = await findSharedCourseId(token);
  const [source, modules, lessons] = await Promise.all([
    Course.findById(sourceId).select('title description tags level modules').lean(),
    Module.find({ course: sourceId }).select('title description order lessons').lean(),
    Lesson.find({ course: sourceId }).select(LESSON_CONTENT_FIELDS).lean(),
  ]);
  if (!source) throw shareNotFound(); // deleted a moment ago

  const course = new Course({
    title: source.title,
    description: source.description,
    tags: source.tags,
    level: source.level,
    creator: user,
  });
  const moduleById = new Map(modules.map((module) => [String(module._id), module]));
  const lessonById = new Map(lessons.map((lesson) => [String(lesson._id), lesson]));
  const newModules = [];
  const newLessons = [];

  // Walk the source in display order (course.modules, then module.lessons)
  for (const moduleId of source.modules) {
    const sourceModule = moduleById.get(String(moduleId));
    if (!sourceModule) continue;
    const module = new Module({
      title: sourceModule.title,
      description: sourceModule.description,
      order: sourceModule.order,
      course: course._id,
    });

    for (const lessonId of sourceModule.lessons) {
      const sourceLesson = lessonById.get(String(lessonId));
      if (!sourceLesson) continue;
      const { _id: _ignored, ...lessonContent } = sourceLesson;
      const lesson = new Lesson({ ...lessonContent, module: module._id, course: course._id });
      module.lessons.push(lesson._id);
      newLessons.push(lesson);
    }

    course.modules.push(module._id);
    newModules.push(module);
  }

  try {
    await Lesson.insertMany(newLessons);
    await Module.insertMany(newModules);
    await course.save();
  } catch (error) {
    await deleteCourseTree(course._id);
    throw error;
  }

  return getCourseForUser(course._id, user);
}
