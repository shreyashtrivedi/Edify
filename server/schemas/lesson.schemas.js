/**
 * zod schemas for lesson generation (stage 2 of the AI pipeline).
 *
 * Design choice: the AI gets ONE flat block shape (`type` + optional fields) instead of a
 * union of seven different objects. Flat schemas are followed far more reliably by LLMs.
 * We then enforce the per-type rules with superRefine and rebuild each block into a clean,
 * typed object with normalizeBlock(), so the database only ever stores well-formed blocks.
 */
import { z } from 'zod';

export const BLOCK_TYPES = ['heading', 'paragraph', 'list', 'code', 'callout', 'video', 'mcq'];
export const RESOURCE_TYPES = ['documentation', 'article', 'book', 'course', 'video', 'tool'];

// ---------- Requests ----------

export const generateLessonSchema = z.object({
  force: z.boolean().default(false), // true = regenerate even if content already exists
});

// ---------- AI output ----------

const aiBlockSchema = z
  .object({
    type: z.enum(BLOCK_TYPES),
    text: z
      .string()
      .optional()
      .describe('heading/paragraph/callout text, or the source code of a code block'),
    items: z.array(z.string()).optional().describe('list items (list blocks only)'),
    ordered: z.boolean().optional().describe('true for numbered steps (list blocks only)'),
    language: z.string().optional().describe('programming language (code blocks only)'),
    variant: z.enum(['tip', 'note', 'warning']).optional().describe('callout style'),
    query: z.string().optional().describe('YouTube search query (video blocks only)'),
    question: z.string().optional().describe('mcq question'),
    options: z.array(z.string()).optional().describe('exactly 4 answer options (mcq only)'),
    answer: z.number().int().optional().describe('0-based index of the correct option (mcq only)'),
    explanation: z.string().optional().describe('why the correct answer is right (mcq only)'),
  })
  .superRefine((block, ctx) => {
    const require = (condition, message) => {
      if (!condition) ctx.addIssue({ code: 'custom', message: `${block.type}: ${message}` });
    };
    switch (block.type) {
      case 'heading':
      case 'paragraph':
      case 'callout':
      case 'code':
        require(block.text?.trim(), 'text is required');
        break;
      case 'list':
        require(block.items?.length >= 2, 'needs at least 2 items');
        break;
      case 'video':
        require(block.query?.trim(), 'query is required');
        break;
      case 'mcq':
        require(block.question?.trim(), 'question is required');
        require(block.options?.length >= 2 && block.options.length <= 6, 'needs 2-6 options');
        require(
          Number.isInteger(block.answer) && block.answer >= 0 && block.answer < (block.options?.length ?? 0),
          'answer must be a valid option index',
        );
        break;
    }
  });

export const lessonContentSchema = z
  .object({
    objectives: z
      .array(z.string().min(5))
      .min(2)
      .max(6)
      .describe('3-5 measurable learning objectives starting with an action verb'),
    keyTopics: z.array(z.string().min(2)).min(2).max(8).describe('3-6 key concepts covered'),
    content: z.array(aiBlockSchema).min(5).max(45).describe('the lesson body as ordered blocks'),
    resources: z
      .array(
        z.object({
          title: z.string().min(2),
          type: z.enum(RESOURCE_TYPES),
          url: z.string().optional().describe('only a stable, official URL you are certain exists'),
          searchQuery: z.string().min(2).describe('web search query to find this resource'),
        }),
      )
      .min(1)
      .max(5)
      .describe('2-4 suggested readings or external resources'),
  })
  .superRefine((lesson, ctx) => {
    const count = (type) => lesson.content.filter((block) => block.type === type).length;
    if (count('mcq') < 3) ctx.addIssue({ code: 'custom', message: 'needs at least 3 mcq blocks' });
    if (count('paragraph') < 2) ctx.addIssue({ code: 'custom', message: 'needs paragraph blocks' });
  });

// ---------- Normalisation ----------

const isHttpsUrl = (value) => {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};

/** Keeps only the fields that belong to each block type (drops anything extra the AI added). */
export function normalizeBlock(block) {
  switch (block.type) {
    case 'heading':
    case 'paragraph':
      return { type: block.type, text: block.text.trim() };
    case 'callout':
      return { type: 'callout', variant: block.variant ?? 'note', text: block.text.trim() };
    case 'list':
      return { type: 'list', ordered: Boolean(block.ordered), items: block.items.map((i) => i.trim()) };
    case 'code':
      return {
        type: 'code',
        language: (block.language || 'text').toLowerCase(),
        text: block.text.replace(/\s+$/, ''),
      };
    case 'video':
      return { type: 'video', query: block.query.trim() };
    case 'mcq':
      return {
        type: 'mcq',
        question: block.question.trim(),
        options: block.options.map((option) => option.trim()),
        answer: block.answer,
        explanation: block.explanation?.trim() ?? '',
      };
  }
}

/** Drops hallucination-prone URLs (non-https / malformed) but keeps the search fallback. */
export function normalizeResource(resource) {
  return {
    title: resource.title.trim(),
    type: resource.type,
    ...(resource.url && isHttpsUrl(resource.url) && { url: resource.url }),
    searchQuery: resource.searchQuery.trim(),
  };
}
