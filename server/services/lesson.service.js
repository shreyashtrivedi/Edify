/**
 * Lesson business logic, i.e. stage 2 of the AI pipeline (lazy generation).
 *
 * A lesson starts as a shell (title only). The first time it is opened, the frontend
 * calls generateLessonContent(): the AI writes the content, lessonContentSchema validates
 * and cleans it (dropping malformed blocks), and we save it and flip isEnriched → true.
 * Every later visit is served straight from MongoDB.
 */
import { Course } from '../models/Course.js';
import { Lesson } from '../models/Lesson.js';
import { Module } from '../models/Module.js';
import { lessonContentSchema } from '../schemas/lesson.schemas.js';
import { ApiError } from '../utils/ApiError.js';
import { generateJSON } from './gemini.service.js';
import { mockLessonContent } from './mocks/mockAi.js';
import { SYSTEM_INSTRUCTION, generateLessonPrompt } from './prompts.js';

/**
 * Generations currently running, keyed by lesson id. If two requests for the same lesson
 * arrive together (double click, two tabs, React StrictMode), the second one waits for the
 * first instead of paying for a duplicate AI call.
 */
const inFlight = new Map();

/** Loads a lesson and checks that its course belongs to the user (404 otherwise). */
async function findOwnedLesson(lessonId, creator) {
  const lesson = await Lesson.findById(lessonId);
  if (!lesson) throw ApiError.notFound('Lesson not found');

  const course = await Course.findOne({ _id: lesson.course, creator }).select('title level').lean();
  if (!course) throw ApiError.notFound('Lesson not found');

  return { lesson, course };
}

export async function getLessonForUser(lessonId, creator) {
  const { lesson } = await findOwnedLesson(lessonId, creator);
  return lesson.toObject();
}

export async function generateLessonContent(lessonId, creator, { force = false } = {}) {
  const { lesson, course } = await findOwnedLesson(lessonId, creator);

  if (lesson.isEnriched && !force) return lesson.toObject(); // already generated: free & instant

  const key = String(lesson._id);
  if (inFlight.has(key)) return inFlight.get(key);

  const job = enrichLesson(lesson, course).finally(() => inFlight.delete(key));
  inFlight.set(key, job);
  return job;
}

async function enrichLesson(lesson, course) {
  const module = await Module.findById(lesson.module)
    .select('title lessons')
    .populate({ path: 'lessons', select: 'title' })
    .lean();

  const { data } = await generateJSON({
    prompt: generateLessonPrompt({
      courseTitle: course.title,
      moduleTitle: module?.title ?? '',
      lessonTitle: lesson.title,
      level: course.level,
      siblingLessons: module?.lessons.map((l) => l.title) ?? [],
    }),
    systemInstruction: SYSTEM_INSTRUCTION,
    schema: lessonContentSchema,
    label: `lesson "${lesson.title}"`,
    enforceSchema: false, // large flexible shape: JSON mode + forgiving zod validation works better
    maxOutputTokens: 8192, // a lesson is ~2-4k tokens; the cap stops runaway output quickly
    temperature: 0.5,
    mock: () => mockLessonContent(lesson.title),
  });

  lesson.objectives = data.objectives;
  lesson.keyTopics = data.keyTopics;
  lesson.content = data.content; // already validated + cleaned by lessonContentSchema
  lesson.resources = data.resources;
  lesson.isEnriched = true;
  await lesson.save();

  return lesson.toObject();
}
