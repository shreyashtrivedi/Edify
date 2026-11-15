/**
 * Hinglish audio narration of a lesson (on request, generated once, then served from MongoDB).
 *
 * Pipeline:
 *   1. Script:  the text model rewrites the lesson as a ~1 minute spoken explanation in
 *               Hinglish (Devanagari Hindi + English technical terms).
 *   2. Speech:  the Gemini TTS model reads the script aloud → raw PCM audio.
 *   3. Encode:  PCM → MP3 (~8x smaller), stored in LessonAudio; the transcript and duration
 *               are saved on the lesson so the UI can show them without loading the audio.
 */
import { env } from '../config/env.js';
import { LessonAudio } from '../models/LessonAudio.js';
import { narrationScriptSchema } from '../schemas/narration.schemas.js';
import { ApiError } from '../utils/ApiError.js';
import { pcmDurationSeconds, pcmToMp3 } from '../utils/audio.js';
import { generateJSON } from './gemini.service.js';
import { findOwnedLesson } from './ownership.service.js';
import { mockNarrationScript } from './mocks/mockAi.js';
import { SYSTEM_INSTRUCTION, generateNarrationPrompt } from './prompts.js';
import { synthesizeSpeech } from './tts.service.js';

const MAX_OUTLINE_CHARS = 5000; // enough context for a 1-minute summary, cheap on tokens

/** Same dedupe idea as lesson generation: concurrent requests share one AI job. */
const inFlight = new Map();

const stripFormatting = (text) => text.replace(/\*\*|`|\*/g, '');

/** The lesson as plain text (headings, paragraphs, list items, tips), without quizzes or code. */
function lessonOutline(lesson) {
  const lines = lesson.content.flatMap((block) => {
    if (block.type === 'heading') return [`\n## ${block.text}`];
    if (block.type === 'paragraph' || block.type === 'callout') return [stripFormatting(block.text)];
    if (block.type === 'list') return block.items.map((item) => `- ${stripFormatting(item)}`);
    return []; // code, video and mcq don't belong in a spoken summary
  });
  return lines.join('\n').slice(0, MAX_OUTLINE_CHARS);
}

export async function generateNarration(lessonId, creator) {
  const { lesson, course } = await findOwnedLesson(lessonId, creator);

  if (!lesson.isEnriched) {
    throw new ApiError(409, 'Open the lesson first: its content must exist before it can be narrated.', {
      code: 'LESSON_NOT_GENERATED',
    });
  }
  if (lesson.narration) return lesson.narration.toObject(); // already recorded: free & instant

  const key = String(lesson._id);
  if (inFlight.has(key)) return inFlight.get(key);

  const job = recordNarration(lesson, course).finally(() => inFlight.delete(key));
  inFlight.set(key, job);
  return job;
}

async function recordNarration(lesson, course) {
  const { data } = await generateJSON({
    prompt: generateNarrationPrompt({
      courseTitle: course.title,
      lessonTitle: lesson.title,
      level: course.level,
      objectives: lesson.objectives,
      outline: lessonOutline(lesson),
    }),
    systemInstruction: SYSTEM_INSTRUCTION,
    schema: narrationScriptSchema,
    label: `narration "${lesson.title}"`,
    enforceSchema: true, // one string field: tiny schema, safe to enforce
    maxOutputTokens: 2048,
    mock: () => mockNarrationScript(lesson.title),
  });

  const { pcm, sampleRate } = await synthesizeSpeech(data.script);
  const mp3 = pcmToMp3(pcm, sampleRate);

  await LessonAudio.findOneAndUpdate(
    { lesson: lesson._id },
    { lesson: lesson._id, course: lesson.course, data: mp3, mimeType: 'audio/mpeg' },
    { upsert: true },
  );

  lesson.narration = {
    transcript: data.script,
    durationSeconds: pcmDurationSeconds(pcm, sampleRate),
    voice: env.GEMINI_TTS_VOICE,
    generatedAt: new Date(),
  };
  await lesson.save();
  return lesson.narration.toObject();
}

/** The MP3 for a lesson the user owns (404 if it was never generated). */
export async function getNarrationAudio(lessonId, creator) {
  const { lesson } = await findOwnedLesson(lessonId, creator);
  // Not .lean(): Mongoose turns the stored BSON binary back into a Node Buffer for us.
  const audio = await LessonAudio.findOne({ lesson: lesson._id });
  if (!audio) throw ApiError.notFound('This lesson has no narration yet');
  return { data: Buffer.from(audio.data), mimeType: audio.mimeType };
}
