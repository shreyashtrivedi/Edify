import { z } from 'zod';

/** POST /api/lessons/:id/tutor   { question } */
export const askTutorSchema = z.object({
  question: z
    .string({ error: 'Type a question' })
    .trim()
    .min(1, 'Type a question')
    .max(1000, 'Keep your question under 1000 characters'),
});
