import mongoose from 'mongoose';

/**
 * A course = the top of the hierarchy:  Course → Module → Lesson.
 * `modules` stores references (ObjectIds) in display order.
 */
const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2000 },
    creator: { type: String, required: true }, // the owner's Auth0 user id (`sub`)
    modules: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Module' }],
    tags: [{ type: String, trim: true, lowercase: true }],

    // What the learner originally asked for, and the options used to generate it
    prompt: { type: String, trim: true, maxlength: 500 },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },
  },
  { timestamps: true },
);

// "List my courses, newest first" is the most common query.
courseSchema.index({ creator: 1, createdAt: -1 });

export const Course = mongoose.model('Course', courseSchema);
