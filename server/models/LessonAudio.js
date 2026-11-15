import mongoose from 'mongoose';

/**
 * The narration audio (MP3) of a lesson, in its own collection.
 *
 * Why not a field on Lesson? A minute of MP3 is ~350 KB. Keeping the binary separate means
 * opening a lesson never downloads its audio; the audio is fetched only when the learner
 * presses play. (MongoDB documents can hold up to 16 MB, so a ~1.5 minute MP3 fits easily.)
 */
const lessonAudioSchema = new mongoose.Schema(
  {
    lesson: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: true, unique: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true }, // cascade deletes
    data: { type: Buffer, required: true }, // stored as BSON binary
    mimeType: { type: String, default: 'audio/mpeg' },
  },
  { timestamps: true },
);

export const LessonAudio = mongoose.model('LessonAudio', lessonAudioSchema);
