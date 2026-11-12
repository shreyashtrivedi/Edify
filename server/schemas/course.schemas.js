/**
 * zod schemas for courses.
 *
 * - Request schemas validate what the frontend sends (used by the validate middleware).
 * - AI output schemas do double duty: they are converted to JSON Schema and sent to
 *   Gemini (so the model is *forced* to return that shape), AND we re-validate the
 *   response with them, because we never trust AI output blindly.
 */
import { z } from 'zod';

export const LEVELS = ['beginner', 'intermediate', 'advanced'];

// ---------- Requests ----------

export const generateCourseSchema = z.object({
  prompt: z
    .string({ error: 'Please describe what you want to learn' })
    .trim()
    .min(3, 'Topic is too short: describe what you want to learn')
    .max(500, 'Topic is too long (max 500 characters)'),
  level: z.enum(LEVELS).default('beginner'),
  moduleCount: z.coerce.number().int().min(3).max(6).optional(), // omitted = let the AI decide
});

// ---------- AI output ----------

export const courseOutlineSchema = z.object({
  title: z.string().min(3).max(150).describe('Compelling, specific course title'),
  description: z
    .string()
    .min(20)
    .max(800)
    .describe('2-3 sentences on what the learner will be able to do after the course'),
  tags: z.array(z.string().min(1).max(40)).min(1).max(8).describe('3-5 short lowercase topic tags'),
  modules: z
    .array(
      z.object({
        title: z.string().min(2).max(150).describe('Concise module title'),
        description: z
          .string()
          .max(500)
          .describe('1-2 sentences on what this module covers and why it matters'),
        lessons: z
          .array(z.string().min(2).max(150))
          .min(3)
          .max(5)
          .describe('3-5 specific, descriptive lesson titles in teaching order'),
      }),
    )
    .min(3)
    .max(6)
    .describe('3-6 modules progressing from foundations to advanced/applied topics'),
});
