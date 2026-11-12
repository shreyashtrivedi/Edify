/**
 * Central error handling.
 *
 * Express 5 automatically forwards errors thrown inside async route handlers to
 * this middleware, so controllers don't need try/catch or an asyncHandler wrapper.
 * Every error response has the same shape:  { error: { message, code?, details? } }
 */
import mongoose from 'mongoose';
import { env } from '../config/env.js';

// 404 for any /api route that didn't match.
export function notFound(req, _res, next) {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
}

// Express recognises an error handler by its 4 arguments, so `_next` must stay.
export function errorHandler(err, _req, res, _next) {
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal server error';
  let details = err.details;

  // Invalid MongoDB ObjectId, e.g. /api/courses/not-an-id
  if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // Mongoose schema validation failed
  if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = 'Validation failed';
    details = Object.values(err.errors).map((e) => ({ path: e.path, message: e.message }));
  }

  // Malformed JSON body (thrown by express.json())
  if (err.type === 'entity.parse.failed') {
    message = 'Request body is not valid JSON';
  }

  if (statusCode >= 500) {
    console.error('💥', err);
    // Never leak internal error messages to users in production.
    if (env.isProduction) message = 'Something went wrong on our side. Please try again.';
  }

  res.status(statusCode).json({
    error: { message, ...(err.code && { code: err.code }), ...(details && { details }) },
  });
}
