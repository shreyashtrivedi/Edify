import mongoose from 'mongoose';

/** A section of a course containing several lessons. Belongs to exactly one course. */
const moduleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 1000 },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    order: { type: Number, required: true, min: 0 }, // 0-based position within the course
    lessons: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' }],
  },
  { timestamps: true },
);

export const Module = mongoose.model('Module', moduleSchema);
