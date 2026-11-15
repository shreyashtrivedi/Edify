/**
 * Learning progress: lesson completion and quiz results, per user.
 *
 * Quizzes are graded HERE from the lesson's stored correct answers. The browser only sends
 * which option was picked; if it sent a score, anyone could claim 100% from the dev tools.
 */
import { Progress } from '../models/Progress.js';
import { ApiError } from '../utils/ApiError.js';
import { findOwnedLesson } from './ownership.service.js';

/** The shape every endpoint returns, also for lessons with no progress yet. */
export function toProgressView(doc) {
  return {
    completed: Boolean(doc?.completedAt),
    completedAt: doc?.completedAt ?? null,
    quizAnswers: doc?.quizAnswers ?? [],
    quizScore: doc?.quizScore ?? 0,
    quizTotal: doc?.quizTotal ?? 0,
  };
}

/** Grades answers against the lesson's MCQ blocks (in order). */
export function gradeQuiz(content, answers) {
  const questions = content.filter((block) => block.type === 'mcq');
  if (answers.length > questions.length) {
    throw ApiError.badRequest(`This lesson has only ${questions.length} quiz questions`);
  }
  answers.forEach((answer, index) => {
    if (answer !== null && answer >= questions[index].options.length) {
      throw ApiError.badRequest(`Question ${index + 1} has no option ${answer}`);
    }
  });

  const score = answers.filter((answer, index) => answer === questions[index].answer).length;
  const answeredAll = questions.length > 0 && answers.length === questions.length && !answers.includes(null);
  return { score, total: questions.length, answeredAll };
}

export async function getLessonProgress(user, lessonId) {
  return toProgressView(await Progress.findOne({ user, lesson: lessonId }).lean());
}

/** Map of lessonId → progress view for one course (used to decorate the course outline). */
export async function getCourseProgressMap(user, courseId) {
  const records = await Progress.find({ user, course: courseId }).lean();
  return new Map(records.map((record) => [String(record.lesson), toProgressView(record)]));
}

export async function updateLessonProgress(user, lessonId, { completed, quizAnswers }) {
  const { lesson } = await findOwnedLesson(lessonId, user);
  if (!lesson.isEnriched) {
    throw new ApiError(409, 'This lesson has no content yet.', { code: 'LESSON_NOT_GENERATED' });
  }

  const existing = await Progress.findOne({ user, lesson: lesson._id });
  const update = {};

  if (quizAnswers !== undefined) {
    const { score, total, answeredAll } = gradeQuiz(lesson.content, quizAnswers);
    Object.assign(update, { quizAnswers, quizScore: score, quizTotal: total });
    // Answering every question completes the lesson (unless the learner says otherwise below).
    if (answeredAll && !existing?.completedAt) update.completedAt = new Date();
  }
  if (completed !== undefined) {
    update.completedAt = completed ? (existing?.completedAt ?? new Date()) : null;
  }

  const record = await Progress.findOneAndUpdate(
    { user, lesson: lesson._id },
    { $set: update, $setOnInsert: { course: lesson.course } },
    { upsert: true, returnDocument: 'after', runValidators: true },
  ).lean();

  return toProgressView(record);
}

/** Completed-lesson counts per course, for the course list. */
export async function getCompletedCounts(user, courseIds) {
  const rows = await Progress.aggregate([
    { $match: { user, course: { $in: courseIds }, completedAt: { $ne: null } } },
    { $group: { _id: '$course', count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [String(row._id), row.count]));
}
