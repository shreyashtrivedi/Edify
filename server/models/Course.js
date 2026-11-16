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

    // Public read-only link: /share/<shareToken>. Not set = not shared. Turning sharing on
    // again creates a NEW token, so a link that was turned off never works again.
    shareToken: { type: String },
    sharedAt: { type: Date },
  },
  { timestamps: true },
);

// "List my courses, newest first" is the most common query.
courseSchema.index({ creator: 1, createdAt: -1 });
// Opening a share link looks the course up by its token. Sparse: unshared courses have none.
courseSchema.index({ shareToken: 1 }, { unique: true, sparse: true });

export const Course = mongoose.model('Course', courseSchema);
