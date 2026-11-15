import { z } from 'zod';

/**
 * PUT /api/lessons/:id/progress
 *   { completed: true }                 → mark the lesson complete (false = undo)
 *   { quizAnswers: [1, null, 3, 0] }    → chosen option index per question, null = unanswered
 * The client never sends a score: the server grades the answers itself.
 */
export const updateProgressSchema = z
  .object({
    completed: z.boolean().optional(),
    quizAnswers: z.array(z.number().int().min(0).max(5).nullable()).max(10).optional(),
  })
  .refine((body) => body.completed !== undefined || body.quizAnswers !== undefined, {
    message: 'Send "completed" and/or "quizAnswers"',
  });
