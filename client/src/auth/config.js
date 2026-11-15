/**
 * Auth0 settings (from client/.env.local, or Vercel's environment variables in production).
 * None of these are secrets: a single-page app has no client secret, and the domain and
 * client id are visible to anyone in the browser anyway.
 */
export const auth0Config = {
  domain: import.meta.env.VITE_AUTH0_DOMAIN,
  clientId: import.meta.env.VITE_AUTH0_CLIENT_ID,
  audience: import.meta.env.VITE_AUTH0_AUDIENCE, // must equal the API Identifier the server checks
};

export const isAuthConfigured = Boolean(
  auth0Config.domain && auth0Config.clientId && auth0Config.audience,
);
