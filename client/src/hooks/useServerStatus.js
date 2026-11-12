import { useEffect, useState } from 'react';
import { api } from '../utils/api';

/**
 * Pings GET /api/health once when the app loads.
 *
 * Render's free tier puts the backend to sleep after ~15 minutes idle; the first
 * request can take 30–60s while it wakes up. Pinging on page load starts that wake-up
 * immediately, and the 'waking' state lets us tell the user what's happening.
 *
 * @returns {'checking' | 'waking' | 'online' | 'offline'}
 */
export function useServerStatus() {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    let cancelled = false;
    const wakingTimer = setTimeout(() => !cancelled && setStatus('waking'), 3000);

    api
      .get('/health')
      .then(() => !cancelled && setStatus('online'))
      .catch(() => !cancelled && setStatus('offline'))
      .finally(() => clearTimeout(wakingTimer));

    return () => {
      cancelled = true;
      clearTimeout(wakingTimer);
    };
  }, []);

  return status;
}
