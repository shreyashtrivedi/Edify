import { describe, expect, it } from 'vitest';
import { toErrorResponse } from '../middlewares/errorHandler.js';
import { ApiError } from '../utils/ApiError.js';

const GENERIC = 'Something went wrong on our side. Please try again.';

describe('toErrorResponse (what the browser sees for an error)', () => {
  it('keeps a deliberate 5xx message in production, because it was written for the user', () => {
    const busy = ApiError.serviceUnavailable("Google's AI service is overloaded right now.", {
      code: 'AI_BUSY',
    });

    expect(toErrorResponse(busy, { isProduction: true })).toEqual({
      statusCode: 503,
      body: { error: { message: "Google's AI service is overloaded right now.", code: 'AI_BUSY' } },
    });
  });

  it('hides an unexpected crash in production: no message, code or details', () => {
    const crash = Object.assign(new Error('E11000 duplicate key in edify.lessons'), {
      code: 11000,
      details: { index: 'course_1' },
    });

    expect(toErrorResponse(crash, { isProduction: true })).toEqual({
      statusCode: 500,
      body: { error: { message: GENERIC } },
    });
  });

  it('shows the real message of a crash in development, to help while coding', () => {
    const crash = new Error("Cannot read properties of undefined (reading 'title')");

    expect(toErrorResponse(crash, { isProduction: false }).body.error.message).toBe(
      "Cannot read properties of undefined (reading 'title')",
    );
  });

  it('passes 4xx messages through unchanged in production', () => {
    const missing = ApiError.notFound('Lesson not found');

    expect(toErrorResponse(missing, { isProduction: true })).toEqual({
      statusCode: 404,
      body: { error: { message: 'Lesson not found' } },
    });
  });
});
