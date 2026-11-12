/**
 * Thin wrapper around Google Gemini for *structured* (JSON) generation.
 *
 * Reliability strategy for AI output:
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

function getClient() {
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
function toApiError(error) {
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
 * @param {object}  options
 * @param {string}  options.prompt             the user prompt (see services/prompts.js)
 * @param {string}  options.systemInstruction  persona + global rules
 * @param {import('zod').ZodType} options.schema  expected output shape
 * @param {string}  [options.label]            name used in logs, e.g. "course outline"
 * @param {number}  [options.temperature]      creativity (0 = deterministic)
 * @param {number}  [options.maxAttempts]      attempts when the output is invalid
 * @returns {Promise<{ data: any, usage?: object }>}
 */
export async function generateJSON({
  prompt,
  systemInstruction,
  schema,
  label = 'generation',
  temperature = 0.7,
  maxAttempts = 2,
}) {
  const ai = getClient();
  const responseJsonSchema = toGeminiSchema(schema);

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
          responseMimeType: 'application/json',
          responseJsonSchema,
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

    try {
      const result = schema.safeParse(parseJSONResponse(text));
      if (result.success) {
        if (!env.isTest) {
          const tokens = response.usageMetadata?.totalTokenCount ?? '?';
          console.info(`🤖 ${label}: ${tokens} tokens in ${Date.now() - startedAt}ms`);
        }
        return { data: result.data, usage: response.usageMetadata };
      }
      console.warn(`⚠️  ${label}: output failed validation (attempt ${attempt}/${maxAttempts})`);
    } catch {
      console.warn(`⚠️  ${label}: output was not valid JSON (attempt ${attempt}/${maxAttempts})`);
    }
  }

  throw ApiError.badGateway('The AI returned an incomplete response. Please try again.', {
    code: 'AI_INVALID_RESPONSE',
  });
}
