import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { courseOutline } from './fixtures/courseOutline.js';
import { authHeader, createTestApp } from './helpers/auth.js';
import { useTestDatabase } from './helpers/db.js';

const { generateContent } = vi.hoisted(() => ({ generateContent: vi.fn() }));
vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent };
  },
}));

const { Course } = await import('../models/Course.js');
const { Module } = await import('../models/Module.js');
const { Lesson } = await import('../models/Lesson.js');

useTestDatabase();
// An agent sends the logged-in test user's token with every request.
const api = request.agent(createTestApp()).set(await authHeader());

const mockOutlineResponse = () =>
  generateContent.mockResolvedValue({ text: JSON.stringify(courseOutline) });

const generate = (body) => api.post('/api/courses/generate').send(body);

beforeEach(() => {
  generateContent.mockReset();
});

describe('POST /api/courses/generate', () => {
  it('generates an outline with AI and saves Course → Modules → Lessons', async () => {
    mockOutlineResponse();

    const res = await generate({ prompt: 'Intro to React Hooks', level: 'beginner' });

    expect(res.status).toBe(201);
    const { course } = res.body;
    expect(course.title).toBe(courseOutline.title);
    expect(course.tags).toEqual(['react', 'hooks', 'javascript']); // lowercased + de-duplicated
    expect(course.modules).toHaveLength(3);
    expect(course.modules[1].title).toBe('Side Effects and Context');
    expect(course.modules[1].lessons.map((l) => l.title)).toEqual(courseOutline.modules[1].lessons);
    expect(course.modules[0].lessons[0]).toMatchObject({ order: 0, isEnriched: false });

    expect(await Course.countDocuments()).toBe(1);
    expect(await Module.countDocuments()).toBe(3);
    expect(await Lesson.countDocuments()).toBe(9);
  });

  it('puts the user topic inside the prompt as tagged data', async () => {
    mockOutlineResponse();

    await generate({ prompt: 'Basics of Copyright Law', level: 'advanced', moduleCount: 4 });

    const { contents } = generateContent.mock.calls[0][0];
    expect(contents).toContain('<learner_request>\nBasics of Copyright Law\n</learner_request>');
    expect(contents).toContain('advanced level');
    expect(contents).toContain('exactly 4 modules');
  });

  it('rejects a missing or too-short prompt with 400', async () => {
    const res = await generate({ prompt: 'a' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details[0].path).toBe('prompt');
    expect(generateContent).not.toHaveBeenCalled();
  });

  it('rejects an unknown level with 400', async () => {
    const res = await generate({ prompt: 'Intro to SQL', level: 'expert' });
    expect(res.status).toBe(400);
  });

  it('returns 502 and saves nothing when the AI output is invalid', async () => {
    generateContent.mockResolvedValue({ text: JSON.stringify({ title: 'Only a title' }) });

    const res = await generate({ prompt: 'Intro to SQL' });

    expect(res.status).toBe(502);
    expect(generateContent).toHaveBeenCalledTimes(2); // original + 1 retry
    expect(await Course.countDocuments()).toBe(0);
  });
});

describe('reading and deleting courses', () => {
  it('lists courses with module and lesson counts', async () => {
    mockOutlineResponse();
    await generate({ prompt: 'Intro to React Hooks' });

    const res = await api.get('/api/courses');

    expect(res.status).toBe(200);
    expect(res.body.courses).toHaveLength(1);
    expect(res.body.courses[0]).toMatchObject({
      title: courseOutline.title,
      moduleCount: 3,
      lessonCount: 9,
      enrichedCount: 0,
    });
  });

  it('returns one course with its modules and lessons', async () => {
    mockOutlineResponse();
    const created = await generate({ prompt: 'Intro to React Hooks' });

    const res = await api.get(`/api/courses/${created.body.course._id}`);

    expect(res.status).toBe(200);
    expect(res.body.course.modules[2].lessons).toHaveLength(3);
  });

  it('returns 400 for a malformed id and 404 for an unknown one', async () => {
    expect((await api.get('/api/courses/not-an-id')).status).toBe(400);
    expect((await api.get('/api/courses/507f1f77bcf86cd799439011')).status).toBe(404);
  });

  it('exports the full course with lesson content for the PDF', async () => {
    mockOutlineResponse();
    const created = await generate({ prompt: 'Intro to React Hooks' });
    const firstLesson = created.body.course.modules[0].lessons[0];
    await Lesson.updateOne(
      { _id: firstLesson._id },
      { isEnriched: true, objectives: ['Explain hooks', 'Use state'], content: [{ type: 'paragraph', text: 'Hi' }] },
    );

    const res = await api.get(`/api/courses/${created.body.course._id}/export`);

    expect(res.status).toBe(200);
    const [lesson, notYet] = res.body.course.modules[0].lessons;
    expect(lesson).toMatchObject({ isEnriched: true, content: [{ type: 'paragraph', text: 'Hi' }] });
    expect(notYet).toMatchObject({ isEnriched: false, content: [] });
  });

  it('deletes a course together with its modules and lessons', async () => {
    mockOutlineResponse();
    const created = await generate({ prompt: 'Intro to React Hooks' });

    const res = await api.delete(`/api/courses/${created.body.course._id}`);

    expect(res.status).toBe(204);
    expect(await Course.countDocuments()).toBe(0);
    expect(await Module.countDocuments()).toBe(0);
    expect(await Lesson.countDocuments()).toBe(0);
  });
});
