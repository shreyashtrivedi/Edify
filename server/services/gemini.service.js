/**
 * Thin wrapper around Google Gemini.
 *  - generateJSON(): *structured* output (course outlines, lessons, narration scripts)
 *  - streamText():   plain text streamed piece by piece (the "ask a doubt" tutor)
 *
 * Reliability strategy for structured AI output:
 *   1. JSON mode + a response schema → Gemini is constrained to emit our exact shape.
 *   2. Defensive parsing → still strip ```json fences / stray prose if they appear.
 *   3. zod validation → reject anything that doesn't match (wrong types, too few lessons...).
 *   4. One automatic retry on invalid output, then a clean 502 error for the UI.
 */
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

let client = null;

/** The shared Gemini SDK client (also used by tts.service.js). */
export function getClient() {
  if (!env.GEMINI_API_KEY) {
    throw ApiError.serviceUnavailable('AI generation is not configured on the server.', {
      code: 'AI_NOT_CONFIGURED',
    });
  }
  // Created lazily so the server can still boot (e.g. for health checks) without a key.
  client ??= new GoogleGenAI({
    apiKey: env.GEMINI_API_KEY,
    // The SDK default is 5 retries with up to 60s back-off, far too long for a user waiting on a spinner.
    httpOptions: { timeout: 60_000, retryOptions: { attempts: 2 } },
  });
  return client;
}

/** zod schema → JSON Schema object that Gemini's `responseJsonSchema` accepts. */
export function toGeminiSchema(zodSchema) {
  const { $schema: _ignored, ...jsonSchema } = z.toJSONSchema(zodSchema);
  return jsonSchema;
}

/**
 * Parses model text into JSON, tolerating Markdown fences or text around the object.
 * @throws {SyntaxError} when no valid JSON object can be found
 */
export function parseJSONResponse(text) {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new SyntaxError('AI response is not valid JSON');
  }
}

/** Maps SDK / network errors to ApiErrors with user-friendly messages. */
export function toApiError(error) {
  if (error instanceof ApiError) return error;

  const status = error?.status;
  console.error('🤖 Gemini request failed:', status ?? '', error?.message);

  if (status === 429) {
    return ApiError.tooManyRequests(
      'The AI service is busy right now (rate limit reached). Please wait a minute and try again.',
      { code: 'AI_RATE_LIMITED' },
    );
  }
  if (status === 400 || status === 401 || status === 403 || status === 404) {
    return ApiError.badGateway('The AI service rejected the request. Check the server AI configuration.', {
      code: 'AI_CONFIG_ERROR',
    });
  }
  return ApiError.badGateway('The AI service is unavailable right now. Please try again.', {
    code: 'AI_UNAVAILABLE',
  });
}

/**
 * Generates content that must match `schema`.
 *
 * Two modes:
 *  - enforceSchema: true  → the schema is sent to Gemini (constrained decoding). Best for
 *    small, rigid shapes like the course outline.
 *  - enforceSchema: false → plain JSON mode; the prompt describes the format and zod
 *    validates/repairs afterwards. Better for large, flexible shapes like lesson content.
 *
 * @param {object}  options
 * @param {string}  options.prompt             the user prompt (see services/prompts.js)
 * @param {string}  options.systemInstruction  persona + global rules
 * @param {import('zod').ZodType} options.schema  expected output shape (always validated)
 * @param {boolean} [options.enforceSchema]    also send the schema to Gemini
 * @param {number}  [options.maxOutputTokens]  hard cap so a runaway response fails fast
 * @param {string}  [options.label]            name used in logs, e.g. "course outline"
 * @param {number}  [options.temperature]      creativity (0 = deterministic)
 * @param {number}  [options.maxAttempts]      attempts when the output is invalid
 * @param {Function} [options.mock]            returns sample data when AI_MOCK=true (dev only)
 * @returns {Promise<{ data: any, usage?: object }>}
 */
export async function generateJSON({
  prompt,
  systemInstruction,
  schema,
  enforceSchema = true,
  maxOutputTokens = 4096,
  label = 'generation',
  temperature = 0.7,
  maxAttempts = 2,
  mock,
}) {
  if (env.AI_MOCK && mock) {
    // Simulate network latency so loading states can be seen and tested.
    await new Promise((resolve) => setTimeout(resolve, 1200));
    return { data: schema.parse(mock()) };
  }

  const ai = getClient();
  const responseJsonSchema = enforceSchema ? toGeminiSchema(schema) : undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const startedAt = Date.now();
    let response;

    try {
      response = await ai.models.generateContent({
        model: env.GEMINI_MODEL,
        contents: prompt,
        config: {
          systemInstruction,
          temperature,
          maxOutputTokens,
          responseMimeType: 'application/json',
          ...(responseJsonSchema && { responseJsonSchema }),
        },
      });
    } catch (error) {
      // Network/quota errors were already retried by the SDK; surface them.
      throw toApiError(error);
    }

    const text = response.text;
    if (!text) {
      // No text usually means the safety filters blocked the prompt or the response.
      const reason = response.promptFeedback?.blockReason || response.candidates?.[0]?.finishReason;
      throw new ApiError(422, "The AI couldn't generate content for this topic. Try rephrasing it.", {
        code: 'AI_BLOCKED',
        ...(reason && { details: { reason } }),
      });
    }

    const finishReason = response.candidates?.[0]?.finishReason; // e.g. MAX_TOKENS = cut off
    try {
      const result = schema.safeParse(parseJSONResponse(text));
      if (result.success) {
        if (!env.isTest) {
          const tokens = response.usageMetadata?.totalTokenCount ?? '?';
          console.info(`🤖 ${label}: ${tokens} tokens in ${Date.now() - startedAt}ms`);
        }
        return { data: result.data, usage: response.usageMetadata };
      }
      const issue = result.error.issues[0];
      console.warn(
        `⚠️  ${label}: failed validation at "${issue.path.join('.')}": ${issue.message} (attempt ${attempt}/${maxAttempts})`,
      );
    } catch {
      console.warn(
        `⚠️  ${label}: not valid JSON, finish reason ${finishReason} (attempt ${attempt}/${maxAttempts})`,
      );
    }
  }

  throw ApiError.badGateway('The AI returned an incomplete response. Please try again.', {
    code: 'AI_INVALID_RESPONSE',
  });
}

/** Waits `ms`, or finishes early (without throwing) when the signal aborts. */
function wait(ms, signal) {
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', done); // don't pile up listeners on a long stream
      resolve();
    };
    const timer = setTimeout(done, ms);
    signal?.addEventListener('abort', done, { once: true });
  });
}

/**
 * The answer text in one streamed chunk. Read from the parts directly (not `chunk.text`)
 * so "thought" parts from thinking models are never shown to the learner.
 */
function chunkText(chunk) {
  const parts = chunk.candidates?.[0]?.content?.parts ?? [];
  return parts
    .filter((part) => typeof part.text === 'string' && !part.thought)
    .map((part) => part.text)
    .join('');
}

/**
 * Streams plain text from Gemini: yields each new piece of the answer as soon as it arrives,
 * so the UI can show it while the rest is still being written.
 *
 * Aborting `signal` (e.g. the learner closed the page) stops the request and ends the stream
 * quietly, without an error.
 *
 * @param {object}   options
 * @param {string}   options.systemInstruction
 * @param {Array<{ role: 'user' | 'model', parts: Array<{ text: string }> }>} options.contents  the conversation
 * @param {AbortSignal} [options.signal]
 * @param {number}   [options.maxOutputTokens]
 * @param {number}   [options.temperature]
 * @param {string}   [options.label]   name used in logs, e.g. "tutor answer"
 * @param {Function} [options.mock]    returns the full sample text when AI_MOCK=true (dev only)
 * @returns {AsyncGenerator<string>}
 */
export async function* streamText({
  systemInstruction,
  contents,
  signal,
  maxOutputTokens = 1024,
  temperature = 0.6,
  label = 'stream',
  mock,
}) {
  if (env.AI_MOCK && mock) {
    // Word by word with a small delay, so streaming can be seen without an API key.
    for (const word of mock().split(/(?<=\s)/)) {
      await wait(30, signal);
      if (signal?.aborted) return;
      yield word;
    }
    return;
  }

  const startedAt = Date.now();
  let produced = false;
  let lastChunk;

  try {
    const stream = await getClient().models.generateContentStream({
      model: env.GEMINI_MODEL,
      contents,
      config: { systemInstruction, temperature, maxOutputTokens, abortSignal: signal },
    });

    for await (const chunk of stream) {
      lastChunk = chunk;
      const text = chunkText(chunk);
      if (text) {
        produced = true;
        yield text;
      }
    }
  } catch (error) {
    if (signal?.aborted) return; // stopped on purpose: not an error
    throw toApiError(error);
  }

  if (!produced) {
    // No text usually means the safety filters blocked the question or the answer.
    const reason = lastChunk?.promptFeedback?.blockReason || lastChunk?.candidates?.[0]?.finishReason;
    throw new ApiError(422, "The AI couldn't answer that. Try rephrasing your question.", {
      code: 'AI_BLOCKED',
      ...(reason && { details: { reason } }),
    });
  }

  if (!env.isTest) {
    const tokens = lastChunk?.usageMetadata?.totalTokenCount ?? '?';
    console.info(`🤖 ${label}: ${tokens} tokens in ${Date.now() - startedAt}ms`);
  }
}
