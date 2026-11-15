import { useAuth0 } from '@auth0/auth0-react';
import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import LoadingSpinner from '../components/ui/LoadingSpinner';

/**
 * Route guard. Wrap routes in <Route element={<RequireAuth />}> and logged-out visitors are
 * sent to Auth0, then brought back to the exact page they asked for (appState.returnTo).
 * The real protection is on the server: this only gives logged-out users a better experience.
 */
export default function RequireAuth() {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();
  const location = useLocation();

  useEffect(() => {
    if (isLoading || isAuthenticated) return;
    loginWithRedirect({ appState: { returnTo: location.pathname + location.search } });
  }, [isLoading, isAuthenticated, loginWithRedirect, location.pathname, location.search]);

  if (!isAuthenticated) return <LoadingSpinner label="Redirecting to login…" fullPage />;
  return <Outlet />;
}
