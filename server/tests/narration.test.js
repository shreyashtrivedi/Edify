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
const { LessonAudio } = await import('../models/LessonAudio.js');

useTestDatabase();
const app = createTestApp();
const api = request.agent(app).set(await authHeader());

const SCRIPT = `नमस्ते! आज हम React Hooks के बारे में सीखेंगे। ${'Hooks function components को state देते हैं। '.repeat(8)}`;
const HALF_SECOND_PCM = Buffer.alloc(24000); // 0.5 s of silence: 12,000 16-bit samples at 24 kHz

/** Fake Gemini: text requests get the script, AUDIO requests get PCM. */
function fakeGemini({ audio = true } = {}) {
  generateContent.mockImplementation(async ({ config }) => {
    if (config.responseModalities?.includes('AUDIO')) {
      return {
        candidates: [
          {
            finishReason: audio ? 'STOP' : 'OTHER',
            content: {
              parts: audio
                ? [{ inlineData: { mimeType: 'audio/L16;codec=pcm;rate=24000', data: HALF_SECOND_PCM.toString('base64') } }]
                : [],
            },
          },
        ],
      };
    }
    if (config.responseJsonSchema?.properties?.script) return { text: JSON.stringify({ script: SCRIPT }) };
    return { text: JSON.stringify(mockLessonContent('Why React Introduced Hooks')) }; // lesson regeneration
  });
}

async function createLesson({ enriched = true } = {}) {
  const course = await saveCourseOutline(courseOutline, { creator: TEST_USER, level: 'beginner' });
  const lessonId = course.modules[0].lessons[0]._id;
  if (enriched) {
    await Lesson.updateOne({ _id: lessonId }, { ...mockLessonContent('Why React Introduced Hooks'), isEnriched: true });
  }
  return { courseId: String(course._id), lessonId: String(lessonId) };
}

const narrate = (lessonId) => api.post(`/api/lessons/${lessonId}/narration`);
const getAudio = (lessonId, agent = api) => agent.get(`/api/lessons/${lessonId}/narration/audio`).responseType('blob');

beforeEach(() => {
  generateContent.mockReset();
});

describe('POST /api/lessons/:id/narration', () => {
  it('writes a Hinglish script, records it with TTS and stores the MP3', async () => {
    fakeGemini();
    const { lessonId } = await createLesson();

    const res = await narrate(lessonId);

    expect(res.status).toBe(200);
    expect(res.body.narration).toMatchObject({ transcript: SCRIPT.trim(), durationSeconds: 1, voice: 'Kore' });

    const [[scriptCall], [ttsCall]] = generateContent.mock.calls;
    expect(scriptCall.contents).toContain('Lesson: "Why React Introduced Hooks"');
    expect(scriptCall.contents).toContain('Devanagari');
    expect(ttsCall.contents[0].parts[0].text).toContain(SCRIPT.trim());
    expect(ttsCall.config).toMatchObject({
      responseModalities: ['AUDIO'],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
      httpOptions: { apiVersion: 'v1beta' },
    });

    const audio = await getAudio(lessonId);
    expect(audio.status).toBe(200);
    expect(audio.headers['content-type']).toBe('audio/mpeg');
    expect(audio.body.length).toBeGreaterThan(500);
    expect(audio.body[0]).toBe(0xff); // MP3 frame sync byte
  });

  it('records only once: later requests reuse the stored narration', async () => {
    fakeGemini();
    const { lessonId } = await createLesson();

    await narrate(lessonId);
    const again = await narrate(lessonId);

    expect(again.status).toBe(200);
    expect(generateContent).toHaveBeenCalledTimes(2); // script + TTS, once
  });

  it('refuses to narrate a lesson whose content does not exist yet', async () => {
    fakeGemini();
    const { lessonId } = await createLesson({ enriched: false });

    const res = await narrate(lessonId);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('LESSON_NOT_GENERATED');
    expect(generateContent).not.toHaveBeenCalled();
  });

  it('returns 502 and saves nothing when TTS returns no audio', async () => {
    fakeGemini({ audio: false });
    vi.spyOn(console, 'warn').mockImplementationOnce(() => {});
    const { lessonId } = await createLesson();

    const res = await narrate(lessonId);

    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('AI_NO_AUDIO');
    expect((await Lesson.findById(lessonId)).narration).toBeUndefined();
    expect(await LessonAudio.countDocuments()).toBe(0);
  });
});

describe('narration lifecycle and access', () => {
  it('returns 404 for the audio before it is recorded', async () => {
    const { lessonId } = await createLesson();
    expect((await getAudio(lessonId)).status).toBe(404);
  });

  it("does not let another user record or download someone else's narration", async () => {
    fakeGemini();
    const { lessonId } = await createLesson();
    await narrate(lessonId);
    const bob = await authHeader('auth0|bob');

    expect((await request(app).post(`/api/lessons/${lessonId}/narration`).set(bob)).status).toBe(404);
    expect((await request(app).get(`/api/lessons/${lessonId}/narration/audio`).set(bob)).status).toBe(404);
  });

  it('removes the narration when the lesson content is regenerated', async () => {
    fakeGemini();
    const { lessonId } = await createLesson();
    await narrate(lessonId);

    await api.post(`/api/lessons/${lessonId}/generate`).send({ force: true });

    expect((await Lesson.findById(lessonId)).narration).toBeUndefined();
    expect(await LessonAudio.countDocuments()).toBe(0);
  });

  it('deletes the audio together with its course', async () => {
    fakeGemini();
    const { courseId, lessonId } = await createLesson();
    await narrate(lessonId);

    await api.delete(`/api/courses/${courseId}`);

    expect(await LessonAudio.countDocuments()).toBe(0);
  });
});
