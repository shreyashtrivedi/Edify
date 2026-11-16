/**
 * Business logic for courses: generate with AI, persist, read, delete.
 * Controllers stay thin (HTTP in/out); everything reusable lives here.
 */
import { Course } from '../models/Course.js';
import { Lesson } from '../models/Lesson.js';
import { LessonAudio } from '../models/LessonAudio.js';
import { Module } from '../models/Module.js';
import { Progress } from '../models/Progress.js';
import { TutorChat } from '../models/TutorChat.js';
import { courseOutlineSchema } from '../schemas/course.schemas.js';
import { ApiError } from '../utils/ApiError.js';
import { generateJSON } from './gemini.service.js';
import { mockCourseOutline } from './mocks/mockAi.js';
import { getCompletedCounts, getCourseProgressMap, toProgressView } from './progress.service.js';
import { SYSTEM_INSTRUCTION, generateCoursePrompt } from './prompts.js';

/**
 * Stage 1 of the pipeline: ask the AI for an outline, then save it.
 */
export async function generateCourse({ prompt, level, moduleCount, creator }) {
  const { data: outline } = await generateJSON({
    prompt: generateCoursePrompt({ topic: prompt, level, moduleCount }),
    systemInstruction: SYSTEM_INSTRUCTION,
    schema: courseOutlineSchema,
    label: 'course outline',
    enforceSchema: true, // small, rigid shape: let Gemini enforce it during decoding
    maxOutputTokens: 4096,
    mock: () => mockCourseOutline(prompt),
  });

  return saveCourseOutline(outline, { creator, prompt, level });
}

/**
 * Persists an outline as Course → Modules → Lesson shells.
 *
 * All _ids are generated in memory first (Mongoose assigns them on `new Model()`),
 * so every reference can be wired up before touching the DB. That means exactly
 * 3 database writes no matter how many modules/lessons the course has.
 * If any write fails, we delete whatever was created, so no half-saved course is left behind.
 */
export async function saveCourseOutline(outline, { creator, prompt, level }) {
  const course = new Course({
    title: outline.title,
    description: outline.description,
    tags: [...new Set(outline.tags.map((tag) => tag.trim().toLowerCase()))],
    creator,
    prompt,
    level,
  });

  const modules = [];
  const lessons = [];

  outline.modules.forEach((moduleOutline, moduleIndex) => {
    const module = new Module({
      title: moduleOutline.title,
      description: moduleOutline.description,
      course: course._id,
      order: moduleIndex,
    });

    moduleOutline.lessons.forEach((lessonTitle, lessonIndex) => {
      const lesson = new Lesson({
        title: lessonTitle,
        module: module._id,
        course: course._id,
        order: lessonIndex,
      });
      module.lessons.push(lesson._id);
      lessons.push(lesson);
    });

    course.modules.push(module._id);
    modules.push(module);
  });

  try {
    await Lesson.insertMany(lessons);
    await Module.insertMany(modules);
    await course.save();
  } catch (error) {
    await deleteCourseTree(course._id);
    throw error;
  }

  return getCourseForUser(course._id, creator);
}

/**
 * Full course with its modules and a light version of each lesson
 * (no content: that's loaded per lesson). Returns 404 for courses the
 * user doesn't own, so we never reveal that someone else's course exists.
 */
export async function getCourseForUser(courseId, creator) {
  const course = await Course.findOne({ _id: courseId, creator })
    .populate({
      path: 'modules',
      select: 'title description order lessons',
      populate: { path: 'lessons', select: 'title order isEnriched' },
    })
    .lean();

  if (!course) throw ApiError.notFound('Course not found');

  // Each lesson gets the user's progress, so the outline can show check marks and scores.
  const progress = await getCourseProgressMap(creator, course._id);
  for (const module of course.modules) {
    module.lessons = module.lessons.map((lesson) => ({
      ...lesson,
      progress: progress.get(String(lesson._id)) ?? toProgressView(null),
    }));
  }
  return course;
}

/**
 * The whole course INCLUDING every lesson's content, in one request (for the course PDF).
 * Lessons that were never opened have no content yet; the PDF lists them as "not generated".
 */
export async function getCourseExportForUser(courseId, creator) {
  const course = await findCourseExport({ _id: courseId, creator });
  if (!course) throw ApiError.notFound('Course not found');
  return course;
}

/** The export shape for any course filter (also used for shared courses). null if not found. */
export function findCourseExport(filter) {
  return Course.findOne(filter)
    .select('title description tags level modules createdAt')
    .populate({
      path: 'modules',
      select: 'title description order lessons',
      populate: {
        path: 'lessons',
        select: 'title order isEnriched objectives keyTopics content resources',
      },
    })
    .lean();
}

/**
 * The user's courses, newest first, with module/lesson counts and how many
 * lessons have been generated so far (useful for progress indicators).
 */
export async function listCoursesForUser(creator) {
  const courses = await Course.find({ creator })
    .sort({ createdAt: -1 })
    .select('title description tags level modules createdAt shareToken')
    .lean();

  const stats = await Lesson.aggregate([
    { $match: { course: { $in: courses.map((course) => course._id) } } },
    {
      $group: {
        _id: '$course',
        lessonCount: { $sum: 1 },
        enrichedCount: { $sum: { $cond: ['$isEnriched', 1, 0] } },
      },
    },
  ]);
  const statsByCourse = new Map(stats.map((s) => [String(s._id), s]));
  const completed = await getCompletedCounts(creator, courses.map((course) => course._id));

  return courses.map(({ modules, shareToken, ...course }) => ({
    ...course,
    isShared: Boolean(shareToken), // the list only needs to know, not the token itself
    moduleCount: modules.length,
    lessonCount: statsByCourse.get(String(course._id))?.lessonCount ?? 0,
    enrichedCount: statsByCourse.get(String(course._id))?.enrichedCount ?? 0,
    completedCount: completed.get(String(course._id)) ?? 0,
  }));
}

export async function deleteCourseForUser(courseId, creator) {
  const course = await Course.findOne({ _id: courseId, creator }).select('_id').lean();
  if (!course) throw ApiError.notFound('Course not found');
  await deleteCourseTree(course._id);
}

/** Deletes a course and everything under it. */
export async function deleteCourseTree(courseId) {
  await Promise.all([
    Lesson.deleteMany({ course: courseId }),
    LessonAudio.deleteMany({ course: courseId }),
    Progress.deleteMany({ course: courseId }),
    TutorChat.deleteMany({ course: courseId }),
    Module.deleteMany({ course: courseId }),
    Course.deleteOne({ _id: courseId }),
  ]);
}
