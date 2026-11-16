/**
 * Rate limiting for expensive endpoints.
 *
 * Every AI request costs money/quota, so we cap how often one client can trigger it.
 * Without this, a single user (or bot) could burn through the whole Gemini quota.
 */
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

function createLimiter({ windowMs, limit, message }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8', // send RateLimit headers so clients know when to retry
    legacyHeaders: false,
    // Count per logged-in user (requireAuth runs first), so users sharing one IP, like a
    // college Wi-Fi, don't block each other. Falls back to the IP if there is no user.
    keyGenerator: (req) => req.user?.sub ?? ipKeyGenerator(req.ip),
    skip: () => env.isTest,
    handler: (_req, _res, next) => next(ApiError.tooManyRequests(message, { code: 'RATE_LIMITED' })),
  });
}

/** Course outlines, lessons and narrations: big, slow generations. */
export const generationLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 15,
  message: 'You are generating content too quickly. Please wait a few minutes and try again.',
});

/** Tutor questions: small and quick, so a higher limit (a separate counter from generations). */
export const tutorLimiter = createLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  limit: 30,
  message: 'You are asking questions very quickly. Please wait a few minutes and try again.',
});
