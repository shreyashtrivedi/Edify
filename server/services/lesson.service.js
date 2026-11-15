/**
 * Lesson business logic, i.e. stage 2 of the AI pipeline (lazy generation).
 *
 * A lesson starts as a shell (title only). The first time it is opened, the frontend
 * calls generateLessonContent(): the AI writes the content, lessonContentSchema validates
 * and cleans it (dropping malformed blocks), the video search query is resolved to a real
 * YouTube video, and we save it and flip isEnriched → true.
 * Every later visit is served straight from MongoDB.
 */
import { LessonAudio } from '../models/LessonAudio.js';
import { Module } from '../models/Module.js';
import { Progress } from '../models/Progress.js';
import { lessonContentSchema } from '../schemas/lesson.schemas.js';
import { generateJSON } from './gemini.service.js';
import { mockLessonContent } from './mocks/mockAi.js';
import { findOwnedLesson } from './ownership.service.js';
import { getLessonProgress } from './progress.service.js';
import { SYSTEM_INSTRUCTION, generateLessonPrompt } from './prompts.js';
import { attachVideos } from './youtube.service.js';

/**
 * Generations currently running, keyed by lesson id. If two requests for the same lesson
 * arrive together (double click, two tabs, React StrictMode), the second one waits for the
 * first instead of paying for a duplicate AI call.
 */
const inFlight = new Map();

/** The lesson plus the user's progress in it (completion, saved quiz answers). */
async function withProgress(lessonObject, user) {
  return { ...lessonObject, progress: await getLessonProgress(user, lessonObject._id) };
}

export async function getLessonForUser(lessonId, creator) {
  const { lesson } = await findOwnedLesson(lessonId, creator);
  return withProgress(lesson.toObject(), creator);
}

export async function generateLessonContent(lessonId, creator, { force = false } = {}) {
  const { lesson, course } = await findOwnedLesson(lessonId, creator);

  if (lesson.isEnriched && !force) return withProgress(lesson.toObject(), creator); // free & instant

  const key = String(lesson._id);
  if (!inFlight.has(key)) {
    inFlight.set(key, enrichLesson(lesson, course).finally(() => inFlight.delete(key)));
  }
  return withProgress(await inFlight.get(key), creator);
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
  // Already validated + cleaned by lessonContentSchema; now resolve video queries to real videos.
  lesson.content = await attachVideos(data.content);
  lesson.resources = data.resources;
  lesson.isEnriched = true;

  // Regenerated content makes an old narration and old quiz answers wrong (the questions
  // changed), so both are reset. Completion is kept: the learner did finish the lesson.
  if (lesson.narration) {
    lesson.narration = undefined;
    await LessonAudio.deleteOne({ lesson: lesson._id });
  }
  await Progress.updateMany({ lesson: lesson._id }, { $set: { quizAnswers: [], quizScore: 0, quizTotal: 0 } });
  await lesson.save();

  return lesson.toObject();
}
