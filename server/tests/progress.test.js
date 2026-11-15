import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { courseOutline } from './fixtures/courseOutline.js';
import { TEST_USER, authHeader, createTestApp } from './helpers/auth.js';
import { useTestDatabase } from './helpers/db.js';

const { generateContent } = vi.hoisted(() => ({ generateContent: vi.fn() }));
vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent };
  },
}));

const { saveCourseOutline } = await import('../services/course.service.js');
const { mockLessonContent } = await import('../services/mocks/mockAi.js');
const { Lesson } = await import('../models/Lesson.js');
const { Progress } = await import('../models/Progress.js');

useTestDatabase();
const app = createTestApp();
const api = request.agent(app).set(await authHeader());

const lessonContent = mockLessonContent('Why React Introduced Hooks');
const CORRECT = lessonContent.content.filter((b) => b.type === 'mcq').map((b) => b.answer); // [1, 2, 1, 2]

async function createCourse({ enriched = true } = {}) {
  const course = await saveCourseOutline(courseOutline, { creator: TEST_USER, level: 'beginner' });
  const lessonId = String(course.modules[0].lessons[0]._id);
  if (enriched) await Lesson.updateOne({ _id: lessonId }, { ...lessonContent, isEnriched: true });
  return { courseId: String(course._id), lessonId };
}

const save = (lessonId, body) => api.put(`/api/lessons/${lessonId}/progress`).send(body);

beforeEach(() => {
  generateContent.mockReset();
});

describe('PUT /api/lessons/:id/progress', () => {
  it('grades partial quiz answers on the server without completing the lesson', async () => {
    const { lessonId } = await createCourse();

    const answers = [CORRECT[0], null, 0]; // right, unanswered, wrong
    const res = await save(lessonId, { quizAnswers: answers });

    expect(res.status).toBe(200);
    expect(res.body.progress).toMatchObject({ quizScore: 1, quizTotal: 4, completed: false, quizAnswers: answers });
  });

  it('completes the lesson automatically when every question is answered', async () => {
    const { lessonId } = await createCourse();

    const res = await save(lessonId, { quizAnswers: [CORRECT[0], CORRECT[1], CORRECT[2], 0] });

    expect(res.body.progress).toMatchObject({ quizScore: 3, quizTotal: 4, completed: true });
    expect(res.body.progress.completedAt).toBeTruthy();
  });

  it('marks complete and undoes it, keeping the original completion time', async () => {
    const { lessonId } = await createCourse();

    const first = await save(lessonId, { completed: true });
    const again = await save(lessonId, { completed: true });
    const undone = await save(lessonId, { completed: false });

    expect(first.body.progress.completed).toBe(true);
    expect(again.body.progress.completedAt).toBe(first.body.progress.completedAt);
    expect(undone.body.progress).toMatchObject({ completed: false, completedAt: null });
  });

  it('rejects answers that do not fit the quiz, and empty bodies', async () => {
    const { lessonId } = await createCourse();

    expect((await save(lessonId, { quizAnswers: [9] })).status).toBe(400); // no option 9
    expect((await save(lessonId, { quizAnswers: [0, 0, 0, 0, 0] })).status).toBe(400); // only 4 questions
    expect((await save(lessonId, {})).status).toBe(400);
  });

  it('refuses progress on a lesson that has no content yet', async () => {
    const { lessonId } = await createCourse({ enriched: false });
    const res = await save(lessonId, { completed: true });
    expect(res.status).toBe(409);
  });

  it("does not let another user touch someone else's lesson", async () => {
    const { lessonId } = await createCourse();
    const res = await request(app)
      .put(`/api/lessons/${lessonId}/progress`)
      .set(await authHeader('auth0|bob'))
      .send({ completed: true });
    expect(res.status).toBe(404);
  });
});

describe('progress in other responses', () => {
  it('includes progress in the lesson, the course outline and the course list', async () => {
    const { courseId, lessonId } = await createCourse();
    await save(lessonId, { quizAnswers: CORRECT });

    const lesson = await api.get(`/api/lessons/${lessonId}`);
    expect(lesson.body.lesson.progress).toMatchObject({ completed: true, quizScore: 4, quizAnswers: CORRECT });

    const course = await api.get(`/api/courses/${courseId}`);
    const [first, second] = course.body.course.modules[0].lessons;
    expect(first.progress).toMatchObject({ completed: true, quizScore: 4, quizTotal: 4 });
    expect(second.progress).toMatchObject({ completed: false, quizTotal: 0 });

    const list = await api.get('/api/courses');
    expect(list.body.courses[0].completedCount).toBe(1);
  });

  it('resets quiz answers (but keeps completion) when the lesson is regenerated', async () => {
    const { lessonId } = await createCourse();
    await save(lessonId, { quizAnswers: CORRECT });
    generateContent.mockResolvedValue({ text: JSON.stringify(lessonContent) });

    const res = await api.post(`/api/lessons/${lessonId}/generate`).send({ force: true });

    expect(res.body.lesson.progress).toMatchObject({ completed: true, quizAnswers: [], quizScore: 0 });
  });

  it('deletes progress together with the course', async () => {
    const { courseId, lessonId } = await createCourse();
    await save(lessonId, { completed: true });

    await api.delete(`/api/courses/${courseId}`);

    expect(await Progress.countDocuments()).toBe(0);
  });
});
