/**
 * Request validation with zod.
 *
 * Usage in a route:
 *   router.post('/', validate({ body: generateCourseSchema }), controller.generate)
 *
 * If the request doesn't match the schema we respond 400 with a list of field errors.
 * If it does, the *parsed* data (trimmed strings, defaults applied) replaces req.body,
 * and parsed query/params are exposed on req.validatedQuery / req.validatedParams
 * (Express 5 makes req.query read-only, so we can't overwrite it).
 */
import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError.js';

function formatIssues(issues, location) {
  return issues.map((issue) => ({
    location,
    path: issue.path.join('.'),
    message: issue.message,
  }));
}

export function validate({ body, query, params } = {}) {
  return (req, _res, next) => {
    const errors = [];

    if (body) {
      const result = body.safeParse(req.body ?? {});
      if (result.success) req.body = result.data;
      else errors.push(...formatIssues(result.error.issues, 'body'));
    }

    if (query) {
      const result = query.safeParse(req.query);
      if (result.success) req.validatedQuery = result.data;
      else errors.push(...formatIssues(result.error.issues, 'query'));
    }

    if (params) {
      const result = params.safeParse(req.params);
      if (result.success) req.validatedParams = result.data;
      else errors.push(...formatIssues(result.error.issues, 'params'));
    }

    if (errors.length) {
      return next(ApiError.badRequest('Invalid request', { code: 'VALIDATION_ERROR', details: errors }));
    }
    next();
  };
}

// Rejects requests whose :param isn't a valid MongoDB ObjectId (before hitting the DB).
export function validateObjectId(paramName = 'id') {
  return (req, _res, next) => {
    if (!mongoose.isValidObjectId(req.params[paramName])) {
      return next(ApiError.badRequest(`Invalid ${paramName}`, { code: 'INVALID_ID' }));
    }
    next();
  };
}
