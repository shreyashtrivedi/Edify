/**
 * An Error that carries an HTTP status code.
 *
 * Throw it anywhere (controllers, services, middleware) and the central
 * errorHandler middleware turns it into a JSON response with that status.
 *   throw ApiError.notFound('Course not found');
 */
export class ApiError extends Error {
  constructor(statusCode, message, { code, details } = {}) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  static badRequest(message = 'Bad request', options) {
    return new ApiError(400, message, options);
  }

  static unauthorized(message = 'Authentication required', options) {
    return new ApiError(401, message, options);
  }

  static forbidden(message = 'You do not have access to this resource', options) {
    return new ApiError(403, message, options);
  }

  static notFound(message = 'Resource not found', options) {
    return new ApiError(404, message, options);
  }

  static tooManyRequests(message = 'Too many requests, please slow down', options) {
    return new ApiError(429, message, options);
  }

  static badGateway(message = 'Upstream service failed', options) {
    return new ApiError(502, message, options);
  }

  static serviceUnavailable(message = 'Service unavailable', options) {
    return new ApiError(503, message, options);
  }
}
