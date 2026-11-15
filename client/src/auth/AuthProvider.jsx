/**
 * Wraps the app in Auth0 and connects it to our API client.
 *
 * Login flow (Authorization Code + PKCE, handled by the Auth0 SDK):
 *  1. loginWithRedirect() sends the user to Auth0's hosted login page (email or Google).
 *  2. Auth0 redirects back to our site with a one-time `?code=`.
 *  3. The SDK exchanges the code for tokens and stores them; isAuthenticated becomes true.
 *  4. onRedirectCallback sends the user back to the page they originally wanted.
 * Passwords never touch our code or database.
 */
import { Auth0Provider, useAuth0 } from '@auth0/auth0-react';
import { useEffect, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router';
import { setAccessTokenGetter, usersApi } from '../utils/api';
import { auth0Config, isAuthConfigured } from './config';
import AuthNotConfigured from './AuthNotConfigured';

export function AuthProvider({ children }) {
  const navigate = useNavigate();

  if (!isAuthConfigured) return <AuthNotConfigured />;

  return (
    <Auth0Provider
      domain={auth0Config.domain}
      clientId={auth0Config.clientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: auth0Config.audience, // ask for an access token our API accepts
      }}
      // Keep the session across page reloads. Refresh tokens renew the access token without
      // a hidden iframe, which modern browsers often block (third-party cookies).
      cacheLocation="localstorage"
      useRefreshTokens
      useRefreshTokensFallback
      onRedirectCallback={(appState) => navigate(appState?.returnTo || '/', { replace: true })}
    >
      <ApiAuthBridge />
      {children}
    </Auth0Provider>
  );
}

/**
 * Gives the axios client a way to get the current access token, and saves the user's
 * profile on the server after login. Renders nothing.
 */
function ApiAuthBridge() {
  const { isAuthenticated, getAccessTokenSilently, user } = useAuth0();

  // A layout effect runs before every normal effect, so the token getter is in place
  // before any component's data fetching starts.
  useLayoutEffect(() => {
    setAccessTokenGetter(isAuthenticated ? getAccessTokenSilently : null);
  }, [isAuthenticated, getAccessTokenSilently]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    usersApi
      .syncProfile({ name: user.name, email: user.email, picture: user.picture })
      .catch(() => {}); // display data only: never block the app if this fails
  }, [isAuthenticated, user]);

  return null;
}
