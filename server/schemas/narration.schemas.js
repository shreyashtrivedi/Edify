import { z } from 'zod';

/**
 * AI output for the narration script (stage 1 of the narration pipeline).
 * ~150-220 spoken words: Devanagari is ~5-7 characters per word, so 200-2500 characters.
 */
export const narrationScriptSchema = z.object({
  script: z.string().trim().min(200).max(2500),
});
