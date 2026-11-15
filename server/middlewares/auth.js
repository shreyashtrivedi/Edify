/**
 * Authentication: only requests with a valid Auth0 access token get through.
 *
 * How it works:
 *  1. The React app logs the user in with Auth0 and receives an access token (a signed JWT).
 *  2. Every API request sends it in the header:  Authorization: Bearer <token>
 *  3. This middleware verifies the token WITHOUT calling Auth0 on each request:
 *     - signature: checked against Auth0's public keys (downloaded once from the tenant's
 *       JWKS endpoint, then cached), so nobody can forge a token
 *     - issuer:    the token was issued by OUR Auth0 tenant
 *     - audience:  the token was issued for THIS API (https://edify-api), not another app
 *     - expiry:    the token is not expired
 *  4. On success, req.user.sub holds the user's stable Auth0 id (e.g. "google-oauth2|1234").
 *     Every course is stored with that id as its `creator`, so users only see their own data.
 */
import { auth } from 'express-oauth2-jwt-bearer';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

/** Verification settings for the real Auth0 tenant (RS256 = public/private key signatures). */
function auth0Options() {
  if (!env.AUTH0_DOMAIN || !env.AUTH0_AUDIENCE) {
    throw new Error('AUTH0_DOMAIN and AUTH0_AUDIENCE must be set in server/.env (see .env.example)');
  }
  return {
    issuerBaseURL: `https://${env.AUTH0_DOMAIN}/`,
    audience: env.AUTH0_AUDIENCE,
    tokenSigningAlg: 'RS256',
  };
}

/** Turns the library's errors into our standard { error: { message, code } } responses. */
function toAuthError(err) {
  if (err.status === 401 && !err.code) {
    return ApiError.unauthorized('Please log in to continue.', { code: 'AUTH_REQUIRED' });
  }
  // The library reports an expired token as '"exp" claim timestamp check failed'.
  if (err.status === 401 && err.message.includes('"exp"')) {
    return ApiError.unauthorized('Your session has expired. Please log in again.', {
      code: 'TOKEN_EXPIRED',
    });
  }
  if (err.status === 400 || err.status === 401) {
    return ApiError.unauthorized('Your login is invalid. Please log in again.', {
      code: 'INVALID_TOKEN',
    });
  }
  return err; // e.g. Auth0 unreachable while downloading keys → 500 via the error handler
}

/**
 * Creates the middleware that protects a router.
 * `options` exists so tests can verify tokens signed with a local test key instead of Auth0.
 */
export function createRequireAuth(options = auth0Options()) {
  const verifyJwt = auth(options);

  return function requireAuth(req, res, next) {
    verifyJwt(req, res, (err) => {
      if (err) return next(toAuthError(err));
      req.user = { sub: req.auth.payload.sub };
      next();
    });
  };
}
