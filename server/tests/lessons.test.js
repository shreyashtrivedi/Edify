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

useTestDatabase();
const api = request.agent(createTestApp()).set(await authHeader());

const lessonResponse = (overrides = {}) => ({
  text: JSON.stringify({ ...mockLessonContent('Why React Introduced Hooks'), ...overrides }),
});

async function createCourse() {
  const course = await saveCourseOutline(courseOutline, { creator: TEST_USER, level: 'beginner' });
  return { course, lessonId: String(course.modules[0].lessons[0]._id) };
}

const generate = (lessonId, body = {}) =>
  api.post(`/api/lessons/${lessonId}/generate`).send(body);

beforeEach(() => {
  generateContent.mockReset();
});

describe('POST /api/lessons/:id/generate', () => {
  it('generates, normalises and saves the lesson content', async () => {
    const { lessonId } = await createCourse();
    const content = mockLessonContent('x').content;
    content[0] = { ...content[0], options: ['stray field'] }; // AI added an irrelevant field
    generateContent.mockResolvedValue(
      lessonResponse({
        content,
        resources: [{ title: 'Fake', type: 'article', url: 'javascript:alert(1)', searchQuery: 'react hooks' }],
      }),
    );

    const res = await generate(lessonId);

    expect(res.status).toBe(200);
    const { lesson } = res.body;
    expect(lesson.isEnriched).toBe(true);
    expect(lesson.objectives.length).toBeGreaterThanOrEqual(2);
    expect(lesson.content[0]).toEqual({ type: 'paragraph', text: content[0].text }); // stray field dropped
    expect(lesson.content.filter((b) => b.type === 'mcq')).toHaveLength(4);
    expect(lesson.resources[0].url).toBeUndefined(); // unsafe URL removed, search fallback kept
    expect(lesson.resources[0].searchQuery).toBe('react hooks');
  });

  it('drops malformed blocks but still saves the lesson, and repairs small mistakes', async () => {
    const { lessonId } = await createCourse();
    const good = mockLessonContent('x').content;
    const content = [
      ...good,
      { type: 'list', items: ['only one item'] }, // too few items → dropped
      { type: 'callout', variant: 'tip' }, // missing text → dropped
      { type: 'flashcard', text: 'unknown type' }, // unknown type → dropped
      { type: 'callout', variant: 'shout', text: 'Bad variant' }, // repaired → "note"
    ];
    generateContent.mockResolvedValue(
      lessonResponse({
        content,
        resources: [{ title: 'Copyright basics', type: 'website', searchQuery: 'copyright basics' }],
      }),
    );

    const res = await generate(lessonId);

    expect(res.status).toBe(200);
    expect(generateContent).toHaveBeenCalledTimes(1); // salvaged, no paid retry needed
    const { content: saved, resources } = res.body.lesson;
    expect(saved).toHaveLength(good.length + 1);
    expect(saved.at(-1)).toEqual({ type: 'callout', variant: 'note', text: 'Bad variant' });
    expect(saved.some((block) => block.type === 'flashcard')).toBe(false);
    expect(resources[0].type).toBe('article'); // unknown type repaired
  });

  it('sends course, module and sibling lessons as context in the prompt', async () => {
    const { lessonId } = await createCourse();
    generateContent.mockResolvedValue(lessonResponse());

    await generate(lessonId);

    const { contents } = generateContent.mock.calls[0][0];
    expect(contents).toContain('Course: "React Hooks from Zero to Confident"');
    expect(contents).toContain('Module: "Foundations of Hooks"');
    expect(contents).toContain('"The Rules of Hooks"'); // a sibling lesson
  });

  it('serves already-generated lessons from the database without calling the AI', async () => {
    const { lessonId } = await createCourse();
    generateContent.mockResolvedValue(lessonResponse());

    await generate(lessonId);
    const second = await generate(lessonId);

    expect(second.status).toBe(200);
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it('regenerates when force is true', async () => {
    const { lessonId } = await createCourse();
    generateContent.mockResolvedValue(lessonResponse());

    await generate(lessonId);
    await generate(lessonId, { force: true });

    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it('makes only one AI call when the same lesson is requested twice at once', async () => {
    const { lessonId } = await createCourse();
    generateContent.mockResolvedValue(lessonResponse());

    const [a, b] = await Promise.all([generate(lessonId), generate(lessonId)]);

    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it('rejects an MCQ whose answer index is out of range, and leaves the lesson unchanged', async () => {
    const { lessonId } = await createCourse();
    const content = mockLessonContent('x').content.map((block) =>
      block.type === 'mcq' ? { ...block, answer: 7 } : block,
    );
    generateContent.mockResolvedValue(lessonResponse({ content }));

    const res = await generate(lessonId);

    expect(res.status).toBe(502);
    expect(generateContent).toHaveBeenCalledTimes(2); // original + retry
    expect((await Lesson.findById(lessonId)).isEnriched).toBe(false);
  });
});

describe('GET /api/lessons/:id', () => {
  it('returns a lesson shell before generation', async () => {
    const { lessonId } = await createCourse();

    const res = await api.get(`/api/lessons/${lessonId}`);

    expect(res.status).toBe(200);
    expect(res.body.lesson).toMatchObject({ title: 'Why React Introduced Hooks', isEnriched: false });
    expect(res.body.lesson.content).toEqual([]);
  });

  it('returns 404 for an unknown lesson', async () => {
    const res = await api.get('/api/lessons/507f1f77bcf86cd799439011');
    expect(res.status).toBe(404);
  });
});
