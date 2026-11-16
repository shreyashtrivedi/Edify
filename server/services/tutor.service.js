/**
 * "Ask a doubt": an AI tutor that answers a learner's questions about one lesson.
 *
 * - Context: the whole lesson (text, code, quiz) goes in the system instruction, so answers
 *   are grounded in what the learner is actually reading.
 * - Memory: the last few messages of the conversation are sent along, so follow-ups like
 *   "can you show that with an example?" work.
 * - Streaming: the answer is produced piece by piece (see streamText); the controller sends
 *   each piece to the browser as it arrives. The question and the answer are saved together
 *   only once the answer is complete.
 */
import mongoose from 'mongoose';
import { MAX_STORED_MESSAGES, TutorChat } from '../models/TutorChat.js';
import { ApiError } from '../utils/ApiError.js';
import { lessonToText } from '../utils/lessonText.js';
import { streamText } from './gemini.service.js';
import { mockTutorAnswer } from './mocks/mockAi.js';
import { findOwnedLesson } from './ownership.service.js';
import { generateTutorInstruction } from './prompts.js';

/** Messages of earlier conversation sent to the AI with each question (5 questions + answers). */
export const HISTORY_FOR_AI = 10;

const toMessageView = (message) => ({
  _id: String(message._id),
  role: message.role,
  text: message.text,
  createdAt: message.createdAt,
});

/** The conversation for the lesson (empty if the learner hasn't asked anything yet). */
export async function getChat(user, lessonId) {
  const { lesson } = await findOwnedLesson(lessonId, user);
  const chat = await TutorChat.findOne({ user, lesson: lesson._id }).select('messages').lean();
  return (chat?.messages ?? []).map(toMessageView);
}

/** Deletes the conversation ("Clear chat"). */
export async function clearChat(user, lessonId) {
  const { lesson } = await findOwnedLesson(lessonId, user);
  await TutorChat.deleteOne({ user, lesson: lesson._id });
}

/**
 * Prepares an answer to `question`. Access checks happen here, before anything is streamed,
 * so they still produce normal HTTP errors (404, 409).
 *
 * @returns {Promise<{ answer: AsyncGenerator<string>, save: (fullAnswer: string) => Promise<object[]> }>}
 *   `answer` yields the answer piece by piece; `save` stores the question + complete answer
 *   and returns both saved messages.
 */
export async function askTutor(user, lessonId, question, { signal } = {}) {
  const { lesson, course } = await findOwnedLesson(lessonId, user);

  if (!lesson.isEnriched) {
    throw new ApiError(409, 'Open the lesson first: the tutor answers questions about its content.', {
      code: 'LESSON_NOT_GENERATED',
    });
  }

  const chat = await TutorChat.findOne({ user, lesson: lesson._id }).select('messages').lean();
  const history = (chat?.messages ?? []).slice(-HISTORY_FOR_AI);

  const answer = streamText({
    systemInstruction: generateTutorInstruction({
      courseTitle: course.title,
      lessonTitle: lesson.title,
      level: course.level,
      lessonText: lessonToText(lesson),
    }),
    // Gemini's chat format: the learner is "user", the tutor is "model"
    contents: [
      ...history.map((message) => ({
        role: message.role === 'tutor' ? 'model' : 'user',
        parts: [{ text: message.text }],
      })),
      { role: 'user', parts: [{ text: question }] },
    ],
    signal,
    label: 'tutor answer',
    mock: () => mockTutorAnswer(question, lesson.title),
  });

  const save = (fullAnswer) =>
    saveExchange({ user, course: lesson.course, lesson: lesson._id, question, answer: fullAnswer.trim() });

  return { answer, save };
}

/** Appends the question + answer in one atomic update, keeping only the newest messages. */
async function saveExchange({ user, course, lesson, question, answer }) {
  const now = Date.now();
  const messages = [
    { _id: new mongoose.Types.ObjectId(), role: 'user', text: question, createdAt: new Date(now) },
    { _id: new mongoose.Types.ObjectId(), role: 'tutor', text: answer, createdAt: new Date(now + 1) },
  ];

  await TutorChat.updateOne(
    { user, lesson },
    {
      $push: { messages: { $each: messages, $slice: -MAX_STORED_MESSAGES } },
      $setOnInsert: { course },
    },
    { upsert: true, runValidators: true },
  );
  return messages.map(toMessageView);
}
