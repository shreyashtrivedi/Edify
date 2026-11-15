import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

// Replace the real Gemini SDK with a fake whose responses each test controls.
const { generateContent } = vi.hoisted(() => ({ generateContent: vi.fn() }));
vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent };
  },
}));

const { generateJSON, parseJSONResponse, toGeminiSchema } = await import(
  '../services/gemini.service.js'
);
const { courseOutlineSchema } = await import('../schemas/course.schemas.js');

const schema = z.object({ answer: z.string(), score: z.number().min(0).max(10) });

/** Visits every node of a JSON Schema. */
function walkSchema(node, visit, path = 'root') {
  visit(node, path);
  for (const [key, child] of Object.entries(node.properties ?? {})) walkSchema(child, visit, `${path}.${key}`);
  if (node.items) walkSchema(node.items, visit, `${path}[]`);
}

// Rules discovered against the real Gemini API: breaking them returns 400 INVALID_ARGUMENT,
// because the schema's constrained-decoding state machine becomes too large.
// Applies to every schema sent with enforceSchema: true (currently the course outline).
describe('enforced AI schemas stay compatible with Gemini', () => {
  const MAX_ITEMS_FOR_OBJECT_ARRAYS = 10; // an array with maxItems 45 of objects was rejected
  const MAX_OPTIONAL_PROPERTIES = 8; // headroom: fewer optional fields = smaller state machine

  it('course outline schema keeps the state machine small', () => {
    const problems = [];
    walkSchema(toGeminiSchema(courseOutlineSchema), (node, path) => {
      if (node.type === 'array' && node.items?.type === 'object' && node.maxItems > MAX_ITEMS_FOR_OBJECT_ARRAYS) {
        problems.push(`${path} is an array of objects with maxItems ${node.maxItems}`);
      }
      const optional = Object.keys(node.properties ?? {}).filter((k) => !node.required?.includes(k));
      if (optional.length > MAX_OPTIONAL_PROPERTIES) {
        problems.push(`${path} has ${optional.length} optional properties`);
      }
      const unbounded = (value) => value === undefined || Math.abs(value) > 1_000_000;
      if (node.type === 'integer' && (unbounded(node.minimum) || unbounded(node.maximum))) {
        problems.push(`${path} is an integer without small explicit bounds`);
      }
    });
    expect(problems).toEqual([]);
  });
});

describe('parseJSONResponse', () => {
  it('parses plain JSON', () => {
    expect(parseJSONResponse('{"answer":"hi","score":3}')).toEqual({ answer: 'hi', score: 3 });
  });

  it('strips Markdown code fences', () => {
    expect(parseJSONResponse('```json\n{"answer":"hi","score":3}\n```')).toEqual({
      answer: 'hi',
      score: 3,
    });
  });

  it('extracts the object when the model adds text around it', () => {
    expect(parseJSONResponse('Sure! Here it is: {"answer":"hi","score":3} Enjoy.')).toEqual({
      answer: 'hi',
      score: 3,
    });
  });

  it('throws when there is no JSON at all', () => {
    expect(() => parseJSONResponse('I cannot help with that.')).toThrow(SyntaxError);
  });
});

describe('toGeminiSchema', () => {
  it('converts zod to a JSON Schema without the $schema key', () => {
    const jsonSchema = toGeminiSchema(schema);
    expect(jsonSchema.$schema).toBeUndefined();
    expect(jsonSchema.type).toBe('object');
    expect(jsonSchema.required).toEqual(['answer', 'score']);
  });
});

describe('generateJSON', () => {
  beforeEach(() => {
    generateContent.mockReset();
  });

  it('returns validated data and sends JSON mode + schema to Gemini', async () => {
    generateContent.mockResolvedValue({ text: '{"answer":"42","score":7}' });

    const { data } = await generateJSON({ prompt: 'p', systemInstruction: 's', schema });

    expect(data).toEqual({ answer: '42', score: 7 });
    const { config } = generateContent.mock.calls[0][0];
    expect(config.responseMimeType).toBe('application/json');
    expect(config.responseJsonSchema.type).toBe('object');
  });

  it('uses plain JSON mode (no schema sent) when enforceSchema is false', async () => {
    generateContent.mockResolvedValue({ text: '{"answer":"42","score":7}' });

    await generateJSON({ prompt: 'p', systemInstruction: 's', schema, enforceSchema: false, maxOutputTokens: 123 });

    const { config } = generateContent.mock.calls[0][0];
    expect(config.responseMimeType).toBe('application/json');
    expect(config.responseJsonSchema).toBeUndefined();
    expect(config.maxOutputTokens).toBe(123);
  });

  it('retries once when the output fails validation', async () => {
    generateContent
      .mockResolvedValueOnce({ text: '{"answer":"42","score":99}' }) // score out of range
      .mockResolvedValueOnce({ text: '{"answer":"42","score":7}' });

    const { data } = await generateJSON({ prompt: 'p', systemInstruction: 's', schema });

    expect(data.score).toBe(7);
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it('gives up with a 502 after repeated invalid output', async () => {
    generateContent.mockResolvedValue({ text: 'not json' });

    await expect(generateJSON({ prompt: 'p', systemInstruction: 's', schema })).rejects.toMatchObject(
      { statusCode: 502, code: 'AI_INVALID_RESPONSE' },
    );
  });

  it('returns 422 when the response is blocked (no text)', async () => {
    generateContent.mockResolvedValue({ text: undefined, promptFeedback: { blockReason: 'SAFETY' } });

    await expect(generateJSON({ prompt: 'p', systemInstruction: 's', schema })).rejects.toMatchObject(
      { statusCode: 422, code: 'AI_BLOCKED' },
    );
  });

  it('maps a Gemini 429 to a friendly rate-limit error', async () => {
    generateContent.mockImplementation(async () => {
      throw Object.assign(new Error('quota exceeded'), { status: 429 });
    });

    await expect(generateJSON({ prompt: 'p', systemInstruction: 's', schema })).rejects.toMatchObject(
      { statusCode: 429, code: 'AI_RATE_LIMITED' },
    );
  });
});
