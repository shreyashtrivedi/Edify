/**
 * Rate limiting for expensive endpoints.
 *
 * Every AI generation costs money/quota, so we cap how often one client can trigger it.
 * Without this, a single user (or bot) could burn through the whole Gemini quota.
 */
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export const generationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 15, // max AI generations per client per window
  standardHeaders: 'draft-8', // send RateLimit headers so clients know when to retry
  legacyHeaders: false,
  // Count per logged-in user (requireAuth runs first), so users sharing one IP, like a
  // college Wi-Fi, don't block each other. Falls back to the IP if there is no user.
  keyGenerator: (req) => req.user?.sub ?? ipKeyGenerator(req.ip),
  skip: () => env.isTest,
  handler: (_req, _res, next) => {
    next(
      ApiError.tooManyRequests(
        'You are generating content too quickly. Please wait a few minutes and try again.',
        { code: 'RATE_LIMITED' },
      ),
    );
  },
});
