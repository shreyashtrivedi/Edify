import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { courseOutline } from './fixtures/courseOutline.js';
import { TEST_USER, authHeader, createTestApp } from './helpers/auth.js';
import { useTestDatabase } from './helpers/db.js';

const { generateContent, generateContentStream } = vi.hoisted(() => ({
  generateContent: vi.fn(),
  generateContentStream: vi.fn(),
}));
vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent, generateContentStream };
  },
}));

const { saveCourseOutline } = await import('../services/course.service.js');
const { mockLessonContent } = await import('../services/mocks/mockAi.js');
const { HISTORY_FOR_AI } = await import('../services/tutor.service.js');
const { Lesson } = await import('../models/Lesson.js');
const { MAX_STORED_MESSAGES, TutorChat } = await import('../models/TutorChat.js');

useTestDatabase();
const app = createTestApp();
const api = request.agent(app).set(await authHeader());

async function createCourse({ enriched = true } = {}) {
  const course = await saveCourseOutline(courseOutline, { creator: TEST_USER, level: 'beginner' });
  const lessonId = String(course.modules[0].lessons[0]._id);
  if (enriched) {
    await Lesson.updateOne(
      { _id: lessonId },
      { ...mockLessonContent('Why React Introduced Hooks'), isEnriched: true },
    );
  }
  return { courseId: String(course._id), lessonId };
}

/** One streamed chunk, shaped like the real Gemini API response. */
const chunk = (parts, extra = {}) => ({
  candidates: [{ content: { parts: parts.map((p) => (typeof p === 'string' ? { text: p } : p)) }, ...extra }],
});

/** Fake Gemini stream that yields `pieces` (then optionally fails). */
function aiStreams(pieces, { failAfter } = {}) {
  generateContentStream.mockImplementation(async () =>
    (async function* () {
      for (const piece of pieces) yield chunk([piece]);
      if (failAfter) throw failAfter;
    })(),
  );
}

/** POST a question and collect the raw streamed body as text. */
const ask = (lessonId, question, agent = api) =>
  agent
    .post(`/api/lessons/${lessonId}/tutor`)
    .send({ question })
    .buffer(true)
    .parse((res, done) => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', (piece) => (text += piece));
      res.on('end', () => done(null, text));
    });

/** NDJSON body → array of events */
const eventsOf = (res) =>
  res.body
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));

beforeEach(() => {
  generateContent.mockReset();
  generateContentStream.mockReset();
});

describe('POST /api/lessons/:id/tutor', () => {
  it('streams the answer piece by piece, then saves the question and the answer', async () => {
    const { lessonId } = await createCourse();
    aiStreams(['Hooks let ', 'function components ', 'keep state.']);

    const res = await ask(lessonId, '  Why were hooks added?  ');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch('application/x-ndjson');
    const events = eventsOf(res);
    expect(events.filter((e) => e.type === 'delta').map((e) => e.text)).toEqual([
      'Hooks let ',
      'function components ',
      'keep state.',
    ]);
    const done = events.at(-1);
    expect(done.type).toBe('done');
    expect(done.messages).toMatchObject([
      { role: 'user', text: 'Why were hooks added?' }, // trimmed by validation
      { role: 'tutor', text: 'Hooks let function components keep state.' },
    ]);

    const chat = await api.get(`/api/lessons/${lessonId}/tutor`);
    expect(chat.body.messages).toEqual(done.messages);
  });

  it('never shows "thought" parts from thinking models', async () => {
    const { lessonId } = await createCourse();
    generateContentStream.mockImplementation(async () =>
      (async function* () {
        yield chunk([{ text: 'Let me think about the plan...', thought: true }, 'The answer.']);
      })(),
    );

    const res = await ask(lessonId, 'Explain it');

    expect(eventsOf(res).at(-1).messages[1].text).toBe('The answer.');
  });

  it('grounds the answer in the lesson and sends the earlier conversation', async () => {
    const { lessonId } = await createCourse();
    aiStreams(['First answer.']);
    await ask(lessonId, 'First question');
    aiStreams(['Second answer.']);
    await ask(lessonId, 'Can you show an example?');

    const { contents, config } = generateContentStream.mock.calls[1][0];
    expect(contents).toEqual([
      { role: 'user', parts: [{ text: 'First question' }] },
      { role: 'model', parts: [{ text: 'First answer.' }] },
      { role: 'user', parts: [{ text: 'Can you show an example?' }] },
    ]);
    // The whole lesson is in the system instruction: text, code and the quiz
    expect(config.systemInstruction).toContain('Why React Introduced Hooks');
    expect(config.systemInstruction).toContain('function average(scores)');
    expect(config.systemInstruction).toContain('Quiz question 1:');
    expect(config.abortSignal).toBeInstanceOf(AbortSignal);
  });

  it(`sends only the last ${HISTORY_FOR_AI} messages to the AI and stores at most ${MAX_STORED_MESSAGES}`, async () => {
    const { courseId, lessonId } = await createCourse();
    const old = Array.from({ length: MAX_STORED_MESSAGES }, (_, i) => ({
      role: i % 2 ? 'tutor' : 'user',
      text: `old message ${i}`,
    }));
    await TutorChat.create({ user: TEST_USER, course: courseId, lesson: lessonId, messages: old });
    aiStreams(['New answer.']);

    await ask(lessonId, 'New question');

    expect(generateContentStream.mock.calls[0][0].contents).toHaveLength(HISTORY_FOR_AI + 1);
    const chat = await TutorChat.findOne({ lesson: lessonId }).lean();
    expect(chat.messages).toHaveLength(MAX_STORED_MESSAGES);
    expect(chat.messages.at(-1).text).toBe('New answer.');
    expect(chat.messages[0].text).toBe('old message 2'); // the two oldest were dropped
  });

  it('rejects empty and very long questions', async () => {
    const { lessonId } = await createCourse();
    expect((await ask(lessonId, '   ')).status).toBe(400);
    expect((await ask(lessonId, 'x'.repeat(1001))).status).toBe(400);
    expect(generateContentStream).not.toHaveBeenCalled();
  });

  it('refuses to answer before the lesson content exists', async () => {
    const { lessonId } = await createCourse({ enriched: false });
    expect((await ask(lessonId, 'Hello?')).status).toBe(409);
  });

  it('returns a normal error with the right status when the AI fails before answering', async () => {
    const { lessonId } = await createCourse();
    generateContentStream.mockRejectedValue(Object.assign(new Error('quota'), { status: 429 }));

    const res = await ask(lessonId, 'Why?');

    expect(res.status).toBe(429);
    expect(JSON.parse(res.body).error.code).toBe('AI_RATE_LIMITED');
    expect(await TutorChat.countDocuments()).toBe(0);
  });

  it('reports a failure in the middle of the answer inside the stream, and saves nothing', async () => {
    const { lessonId } = await createCourse();
    aiStreams(['Half an ans'], { failAfter: Object.assign(new Error('reset'), { status: 503 }) });

    const res = await ask(lessonId, 'Why?');

    expect(res.status).toBe(200); // the header was already sent
    expect(eventsOf(res).map((e) => e.type)).toEqual(['delta', 'error']);
    expect(eventsOf(res)[1].error.code).toBe('AI_UNAVAILABLE');
    expect(await TutorChat.countDocuments()).toBe(0);
  });

  it('treats an answer with no text as blocked', async () => {
    const { lessonId } = await createCourse();
    generateContentStream.mockImplementation(async () =>
      (async function* () {
        yield chunk([], { finishReason: 'SAFETY' });
      })(),
    );

    const res = await ask(lessonId, 'Something unsafe');

    expect(res.status).toBe(422);
    expect(JSON.parse(res.body).error).toMatchObject({ code: 'AI_BLOCKED', details: { reason: 'SAFETY' } });
  });

  it('stops the AI and saves nothing when the learner leaves mid-answer', async () => {
    const { lessonId } = await createCourse();
    let aiSignal;
    generateContentStream.mockImplementation(async ({ config }) => {
      aiSignal = config.abortSignal;
      return (async function* () {
        yield chunk(['The first part... ']);
        // Like the real SDK: the request fails with an AbortError once the signal aborts
        await new Promise((_resolve, reject) =>
          aiSignal.addEventListener('abort', () =>
            reject(Object.assign(new Error('aborted'), { name: 'AbortError' })),
          ),
        );
      })();
    });

    // A real HTTP server, so the client can really disconnect
    const server = app.listen(0);
    try {
      const browser = new AbortController();
      const res = await fetch(`http://127.0.0.1:${server.address().port}/api/lessons/${lessonId}/tutor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify({ question: 'Explain hooks' }),
        signal: browser.signal,
      });
      await res.body.getReader().read(); // the first piece arrived...
      browser.abort(); // ...and the learner closes the page

      await vi.waitFor(() => expect(aiSignal.aborted).toBe(true));
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(await TutorChat.countDocuments()).toBe(0);
    } finally {
      server.closeAllConnections();
      server.close();
    }
  });
});

describe('GET / DELETE /api/lessons/:id/tutor', () => {
  it('returns an empty conversation before any question', async () => {
    const { lessonId } = await createCourse();
    const res = await api.get(`/api/lessons/${lessonId}/tutor`);
    expect(res.body).toEqual({ messages: [] });
  });

  it('clears the conversation', async () => {
    const { lessonId } = await createCourse();
    aiStreams(['An answer.']);
    await ask(lessonId, 'A question');

    expect((await api.delete(`/api/lessons/${lessonId}/tutor`)).status).toBe(204);
    expect((await api.get(`/api/lessons/${lessonId}/tutor`)).body.messages).toEqual([]);
  });

  it("keeps other users out of someone else's lesson", async () => {
    const { lessonId } = await createCourse();
    const bob = request.agent(app).set(await authHeader('auth0|bob'));

    expect((await bob.get(`/api/lessons/${lessonId}/tutor`)).status).toBe(404);
    expect((await ask(lessonId, 'Hi', bob)).status).toBe(404);
    expect((await bob.delete(`/api/lessons/${lessonId}/tutor`)).status).toBe(404);
    expect(generateContentStream).not.toHaveBeenCalled();
  });

  it('deletes the conversation together with the course', async () => {
    const { courseId, lessonId } = await createCourse();
    aiStreams(['An answer.']);
    await ask(lessonId, 'A question');

    await api.delete(`/api/courses/${courseId}`);

    expect(await TutorChat.countDocuments()).toBe(0);
  });
});
