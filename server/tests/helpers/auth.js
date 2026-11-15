/**
 * Test authentication.
 *
 * Tests can't log in to the real Auth0 tenant, so they use the SAME verification library
 * configured with a local secret key (HS256) instead of Auth0's public keys (RS256).
 * tokenFor() signs tokens with that key, so every check (signature, issuer, audience,
 * expiry) runs for real, with no network calls.
 */
import { SignJWT } from 'jose';
import { createApp } from '../../app.js';
import { createRequireAuth } from '../../middlewares/auth.js';

const TEST_ISSUER = 'https://edify-test.auth0.local/';
const TEST_AUDIENCE = 'https://edify-api';
const TEST_SECRET = 'edify-test-secret-that-is-at-least-32-bytes-long';
const key = new TextEncoder().encode(TEST_SECRET);

export const testRequireAuth = createRequireAuth({
  issuer: TEST_ISSUER,
  audience: TEST_AUDIENCE,
  secret: TEST_SECRET,
  tokenSigningAlg: 'HS256',
});

/** The app wired to the test auth middleware. */
export const createTestApp = () => createApp({ requireAuth: testRequireAuth });

export const TEST_USER = 'auth0|test-user';

/** A signed access token for `sub`. Override claims to build invalid tokens. */
export function tokenFor(sub = TEST_USER, { issuer = TEST_ISSUER, audience = TEST_AUDIENCE, expiresIn = '1h' } = {}) {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(sub)
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(key);
}

/** { Authorization: 'Bearer …' } for supertest's .set(). */
export async function authHeader(sub = TEST_USER) {
  return { Authorization: `Bearer ${await tokenFor(sub)}` };
}
