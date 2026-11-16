import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { courseOutline } from './fixtures/courseOutline.js';
import { TEST_USER, authHeader, createTestApp } from './helpers/auth.js';
import { useTestDatabase } from './helpers/db.js';

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent: vi.fn(), generateContentStream: vi.fn() };
  },
}));

const { saveCourseOutline } = await import('../services/course.service.js');
const { mockLessonContent } = await import('../services/mocks/mockAi.js');
const { Course } = await import('../models/Course.js');
const { Lesson } = await import('../models/Lesson.js');

useTestDatabase();
const app = createTestApp();
const owner = request.agent(app).set(await authHeader()); // TEST_USER owns the course
const bob = request.agent(app).set(await authHeader('auth0|bob'));
const visitor = request(app); // no login at all

const lessonContent = mockLessonContent('Why React Introduced Hooks');

/** A course whose first lesson has content and whose second lesson was never opened. */
async function createCourse() {
  const course = await saveCourseOutline(courseOutline, {
    creator: TEST_USER,
    level: 'beginner',
    prompt: 'my private prompt',
  });
  const [first, second] = course.modules[0].lessons.map((lesson) => String(lesson._id));
  await Lesson.updateOne(
    { _id: first },
    { ...lessonContent, isEnriched: true, narration: { transcript: 'नमस्ते', durationSeconds: 60, voice: 'Kore' } },
  );
  return { courseId: String(course._id), firstLessonId: first, secondLessonId: second };
}

async function share(courseId) {
  const res = await owner.post(`/api/courses/${courseId}/share`);
  return res.body.share.token;
}

describe('turning sharing on and off (owner)', () => {
  it('creates an unguessable token, and returns the same one when asked again', async () => {
    const { courseId } = await createCourse();

    const first = await owner.post(`/api/courses/${courseId}/share`);
    const again = await owner.post(`/api/courses/${courseId}/share`);

    expect(first.status).toBe(200);
    expect(first.body.share.token).toMatch(/^[A-Za-z0-9_-]{22}$/); // 128 random bits
    expect(first.body.share.sharedAt).toBeTruthy();
    expect(again.body.share.token).toBe(first.body.share.token);
  });

  it('hands out a single token even when "share" is clicked twice at the same moment', async () => {
    const { courseId } = await createCourse();

    const [a, b] = await Promise.all([
      owner.post(`/api/courses/${courseId}/share`),
      owner.post(`/api/courses/${courseId}/share`),
    ]);

    const saved = await Course.findById(courseId).lean();
    expect(a.body.share.token).toBe(saved.shareToken);
    expect(b.body.share.token).toBe(saved.shareToken);
  });

  it('stops the link working when turned off, and makes a NEW link when turned on again', async () => {
    const { courseId } = await createCourse();
    const oldToken = await share(courseId);

    expect((await owner.delete(`/api/courses/${courseId}/share`)).status).toBe(204);
    const off = await visitor.get(`/api/share/${oldToken}`);
    expect(off.status).toBe(404);
    expect(off.body.error.code).toBe('SHARE_NOT_FOUND');

    const newToken = await share(courseId);
    expect(newToken).not.toBe(oldToken);
    expect((await visitor.get(`/api/share/${oldToken}`)).status).toBe(404); // old link stays dead
    expect((await visitor.get(`/api/share/${newToken}`)).status).toBe(200);
  });

  it("shows the owner whether a course is shared, and keeps others' courses private", async () => {
    const { courseId } = await createCourse();
    await share(courseId);

    const list = await owner.get('/api/courses');
    expect(list.body.courses[0].isShared).toBe(true);
    expect(list.body.courses[0].shareToken).toBeUndefined(); // the list doesn't need the token

    expect((await bob.post(`/api/courses/${courseId}/share`)).status).toBe(404);
    expect((await bob.delete(`/api/courses/${courseId}/share`)).status).toBe(404);
  });
});

describe('reading a shared course (no login)', () => {
  it('returns the outline without any owner details', async () => {
    const { courseId } = await createCourse();
    const token = await share(courseId);

    const res = await visitor.get(`/api/share/${token}`);

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body.course.title).toBe(courseOutline.title);
    expect(res.body.course.modules[0].lessons[0]).toMatchObject({ isEnriched: true });
    for (const privateField of ['creator', 'prompt', 'shareToken']) {
      expect(res.body.course).not.toHaveProperty(privateField);
    }
  });

  it('returns lesson content, but no narration or progress', async () => {
    const { courseId, firstLessonId, secondLessonId } = await createCourse();
    const token = await share(courseId);

    const first = await visitor.get(`/api/share/${token}/lessons/${firstLessonId}`);
    expect(first.body.lesson.content).toEqual(lessonContent.content);
    expect(first.body.lesson).not.toHaveProperty('narration');
    expect(first.body.lesson).not.toHaveProperty('progress');

    // Never opened by the owner: no content, and visitors can't trigger AI generation
    const second = await visitor.get(`/api/share/${token}/lessons/${secondLessonId}`);
    expect(second.body.lesson).toMatchObject({ isEnriched: false, content: [] });
  });

  it('only serves lessons that belong to the shared course', async () => {
    const shared = await createCourse();
    const other = await createCourse(); // not shared
    const token = await share(shared.courseId);

    expect((await visitor.get(`/api/share/${token}/lessons/${other.firstLessonId}`)).status).toBe(404);
    expect((await visitor.get(`/api/share/${token}/lessons/not-an-id`)).status).toBe(400);
  });

  it('serves the full export for the course PDF', async () => {
    const { courseId } = await createCourse();
    const token = await share(courseId);

    const res = await visitor.get(`/api/share/${token}/export`);

    expect(res.body.course.modules[0].lessons[0].content).toEqual(lessonContent.content);
    expect(res.body.course).not.toHaveProperty('creator');
  });

  it('answers 404 for unknown and malformed tokens', async () => {
    expect((await visitor.get('/api/share/AAAAAAAAAAAAAAAAAAAAAA')).status).toBe(404);
    expect((await visitor.get('/api/share/short')).status).toBe(404);
  });

  it('stops working when the course is deleted', async () => {
    const { courseId } = await createCourse();
    const token = await share(courseId);
    await owner.delete(`/api/courses/${courseId}`);
    expect((await visitor.get(`/api/share/${token}`)).status).toBe(404);
  });
});

describe('saving a copy (logged-in visitor)', () => {
  it('requires a login', async () => {
    const { courseId } = await createCourse();
    const token = await share(courseId);
    expect((await visitor.post(`/api/share/${token}/copy`)).status).toBe(401);
  });

  it("copies the course and its lessons into the visitor's own library", async () => {
    const { courseId, firstLessonId } = await createCourse();
    const token = await share(courseId);

    const res = await bob.post(`/api/share/${token}/copy`);

    expect(res.status).toBe(201);
    const copy = res.body.course;
    expect(copy._id).not.toBe(courseId);
    expect(copy.title).toBe(courseOutline.title);
    expect(copy.modules.map((m) => m.title)).toEqual(courseOutline.modules.map((m) => m.title));
    expect(copy.modules[0].lessons.map((l) => l.title)).toEqual(courseOutline.modules[0].lessons);

    // The copy is really bob's: in his list, readable, and he can track progress on it
    const bobsCourses = await bob.get('/api/courses');
    expect(bobsCourses.body.courses.map((c) => c._id)).toEqual([copy._id]);
    const copiedLessonId = copy.modules[0].lessons[0]._id;
    expect(copiedLessonId).not.toBe(firstLessonId);
    const lesson = await bob.get(`/api/lessons/${copiedLessonId}`);
    expect(lesson.body.lesson.content).toEqual(lessonContent.content);
    expect(lesson.body.lesson.narration).toBeUndefined(); // the owner's audio isn't copied
    expect((await bob.put(`/api/lessons/${copiedLessonId}/progress`).send({ completed: true })).status).toBe(200);

    // The original is untouched and still only the owner's
    const original = await Course.findById(courseId).lean();
    expect(original.creator).toBe(TEST_USER);
    expect((await bob.get(`/api/courses/${courseId}`)).status).toBe(404);
  });

  it('refuses to copy from a link that was turned off', async () => {
    const { courseId } = await createCourse();
    const token = await share(courseId);
    await owner.delete(`/api/courses/${courseId}/share`);
    expect((await bob.post(`/api/share/${token}/copy`)).status).toBe(404);
  });
});
