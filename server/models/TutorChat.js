import mongoose from 'mongoose';

/** How many messages are kept per chat (oldest are dropped first): 30 questions + answers. */
export const MAX_STORED_MESSAGES = 60;

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'tutor'], required: true },
  text: { type: String, required: true, maxlength: 10_000 },
  createdAt: { type: Date, default: Date.now },
});

/**
 * One learner's "ask a doubt" conversation about one lesson.
 *
 * Stored on the server (not just in the browser) so the chat survives reloads, and so the
 * history sent back to the AI is the real one: a client can't slip in fake "tutor" messages
 * to steer the model.
 */
const tutorChatSchema = new mongoose.Schema(
  {
    user: { type: String, required: true }, // Auth0 `sub`
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    lesson: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: true },
    messages: { type: [messageSchema], default: [] },
  },
  { timestamps: true },
);

tutorChatSchema.index({ user: 1, lesson: 1 }, { unique: true }); // one chat per learner per lesson
tutorChatSchema.index({ course: 1 }); // deleting a course deletes its chats

export const TutorChat = mongoose.model('TutorChat', tutorChatSchema);
