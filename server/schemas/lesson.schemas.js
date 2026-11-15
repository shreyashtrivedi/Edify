/**
 * zod schemas for lesson generation (stage 2 of the AI pipeline).
 *
 * Unlike the course outline, lesson output is NOT sent to Gemini as a response schema.
 * Tested against the real API: on this large, flexible block format, schema-constrained
 * decoding made the fast model worse (text put in the wrong fields, runaway repetition
 * until the token limit). Plain JSON mode + a precise prompt + the validation below was
 * reliable. So here zod is the safety net, and it is deliberately *forgiving*:
 *
 *  - Each block is validated on its own. A malformed block is DROPPED instead of failing
 *    the whole lesson (salvage the good content, don't pay for a full retry).
 *  - Small mistakes are repaired: unknown callout variant → "note", unknown resource type
 *    → "article", non-https resource URL → removed (search fallback kept).
 *  - Unknown fields are stripped, so only clean, typed blocks reach the database.
 *  - The lesson is rejected (→ one retry) only if what remains isn't a usable lesson:
 *    fewer than 3 valid quiz questions or fewer than 2 paragraphs.
 */
import { z } from 'zod';

export const RESOURCE_TYPES = ['documentation', 'article', 'book', 'course', 'video', 'tool'];

// ---------- Requests ----------

export const generateLessonSchema = z.object({
  force: z.boolean().default(false), // true = regenerate even if content already exists
});

// ---------- Content blocks ----------

const text = z.string().trim().min(1);

/** One schema per block type. z.object strips any fields not listed here. */
const BLOCK_SCHEMAS = {
  heading: z.object({ type: z.literal('heading'), text }),
  paragraph: z.object({ type: z.literal('paragraph'), text }),
  list: z.object({
    type: z.literal('list'),
    ordered: z.boolean().catch(false),
    items: z.array(text).min(2),
  }),
  code: z.object({
    type: z.literal('code'),
    language: z
      .string()
      .optional()
      .catch(undefined)
      .transform((language) => language?.trim().toLowerCase() || 'text'),
    text: z.string().transform((code) => code.replace(/\s+$/, '')).pipe(text),
  }),
  callout: z.object({
    type: z.literal('callout'),
    variant: z.enum(['tip', 'note', 'warning']).catch('note'),
    text,
  }),
  video: z.object({ type: z.literal('video'), query: text }),
  mcq: z
    .object({
      type: z.literal('mcq'),
      question: text,
      options: z.array(text).min(2).max(6),
      answer: z.number().int().min(0),
      explanation: z.string().trim().catch(''),
    })
    .refine((mcq) => mcq.answer < mcq.options.length, 'answer must be a valid option index'),
};

export const BLOCK_TYPES = Object.keys(BLOCK_SCHEMAS);

/** Returns a clean block, or null if the block is unknown or malformed. */
export function parseBlock(raw) {
  const result = BLOCK_SCHEMAS[raw?.type]?.safeParse(raw);
  return result?.success ? result.data : null;
}

// ---------- Resources ----------

const isHttpsUrl = (value) => {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};

const resourceSchema = z
  .object({
    title: text,
    type: z
      .string()
      .catch('article')
      .transform((type) => (RESOURCE_TYPES.includes(type?.toLowerCase()) ? type.toLowerCase() : 'article')),
    url: z.string().trim().optional().catch(undefined),
    searchQuery: z.string().trim().optional().catch(undefined),
  })
  .transform(({ title, type, url, searchQuery }) => ({
    title,
    type,
    // AI-written URLs are hallucination-prone: keep only well-formed https links...
    ...(url && isHttpsUrl(url) && { url }),
    // ...and always keep a web-search fallback.
    searchQuery: searchQuery || title,
  }));

/** Keeps only the items of `list` that parse with `schema`. */
const keepValid = (schema) => (list) =>
  list.flatMap((item) => {
    const result = schema.safeParse(item);
    return result.success ? [result.data] : [];
  });

// ---------- Full lesson ----------

export const lessonContentSchema = z.object({
  objectives: z.array(text).min(2).transform((list) => list.slice(0, 6)),
  keyTopics: z.array(text).min(1).transform((list) => list.slice(0, 8)),
  content: z
    .array(z.unknown())
    .transform((blocks) => blocks.map(parseBlock).filter(Boolean).slice(0, 45))
    .superRefine((blocks, ctx) => {
      const count = (type) => blocks.filter((block) => block.type === type).length;
      if (count('mcq') < 3) ctx.addIssue({ code: 'custom', message: 'needs at least 3 valid mcq blocks' });
      if (count('paragraph') < 2) ctx.addIssue({ code: 'custom', message: 'needs at least 2 paragraphs' });
    }),
  resources: z
    .array(z.unknown())
    .transform(keepValid(resourceSchema))
    .transform((list) => list.slice(0, 5)),
});
