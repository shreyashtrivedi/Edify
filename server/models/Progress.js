import mongoose from 'mongoose';

/**
 * One learner's progress in one lesson: completion and quiz answers.
 *
 * Kept separate from Lesson (and keyed by user) because progress belongs to the *learner*,
 * not to the lesson content: content can be regenerated, or copied from a share link into
 * someone else's library, without mixing up anyone's progress.
 */
const progressSchema = new mongoose.Schema(
  {
    user: { type: String, required: true }, // Auth0 `sub`
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    lesson: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: true },

    completedAt: { type: Date, default: null }, // null = not completed
    quizAnswers: { type: [{ type: Number, min: 0 }], default: [] }, // chosen option per question (null = unanswered)
    quizScore: { type: Number, default: 0, min: 0 }, // graded on the server
    quizTotal: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

progressSchema.index({ user: 1, lesson: 1 }, { unique: true }); // one record per learner per lesson
progressSchema.index({ user: 1, course: 1 }); // "my progress in this course"

export const Progress = mongoose.model('Progress', progressSchema);
