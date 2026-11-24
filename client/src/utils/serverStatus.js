/**
 * Is the API awake? One shared answer for the whole app.
 *
 * Render's free plan stops the API after ~15 minutes without requests, and the next request
 * then waits 30–60 s while it starts again. So the app pings GET /api/health the moment it
 * loads (main.jsx), before the user has clicked anything:
 *
 *   answered within 3 s           → 'online'   (nobody notices anything)
 *   still waiting after 3 s       → 'waking'   (ServerWakingNotice explains the delay)
 *   the ping fails                → retry every 5 s (Render can answer 502/503 while starting)
 *   still failing after 2 minutes → 'offline'  (with a "Try again" button)
 *
 * Every API response also counts as "the API is awake", and coming back to the tab after a
 * long break checks again, because the API may have gone back to sleep in the meantime.
 *
 * @typedef {'checking' | 'waking' | 'online' | 'offline'} ServerStatus
 */
import { api } from './api';

/** Render sleeps after 15 idle minutes; re-check a little before that. */
const SLEEPS_AFTER_MS = 14 * 60_000;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** The logic, with the ping and timings passed in so tests can control them. */
export function createServerStatus({
  ping,
  wakingAfterMs = 3000,
  retryEveryMs = 5000,
  giveUpAfterMs = 120_000,
  staleAfterMs = SLEEPS_AFTER_MS,
}) {
  /** @type {ServerStatus} */
  let status = 'checking';
  let checking = false;
  let lastContactAt = 0; // when the API last answered anything (0 = not yet)
  const listeners = new Set();

  function setStatus(next) {
    if (next === status) return;
    status = next;
    listeners.forEach((listener) => listener());
  }

  /** The API just answered, so it is awake. */
  function markContact() {
    lastContactAt = Date.now();
    setStatus('online');
  }

  /** Pings until the API answers or we give up. Skipped while a check runs or right after contact. */
  async function check() {
    if (checking || (lastContactAt && Date.now() - lastContactAt < staleAfterMs)) return;
    checking = true;
    setStatus('checking');
    const startedAt = Date.now();
    const wakingTimer = setTimeout(() => {
      if (status === 'checking') setStatus('waking');
    }, wakingAfterMs);

    try {
      for (;;) {
        try {
          await ping();
          markContact();
          return;
        } catch {
          if (lastContactAt >= startedAt) return; // another request got through meanwhile
          if (Date.now() - startedAt + retryEveryMs >= giveUpAfterMs) {
            setStatus('offline');
            return;
          }
          setStatus('waking');
          await wait(retryEveryMs);
        }
      }
    } finally {
      clearTimeout(wakingTimer);
      checking = false;
    }
  }

  return {
    check,
    markContact,
    getStatus: () => status,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** The app's single instance. The health check is public, so it never waits for a login token. */
const serverStatus = createServerStatus({
  ping: () => api.get('/health', { skipAuth: true }),
});

export const {
  check: checkServer,
  getStatus: getServerStatus,
  subscribe: subscribeToServerStatus,
} = serverStatus;

/** Called once from main.jsx: starts the first check and keeps the status up to date. */
export function startServerStatus() {
  api.interceptors.response.use(
    (response) => {
      serverStatus.markContact();
      return response;
    },
    (error) => {
      // A 4xx (or our own error) still means the API answered; 502/503 can come from Render's proxy
      if (error.response && error.response.status < 500) serverStatus.markContact();
      return Promise.reject(error);
    },
  );

  serverStatus.check();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') serverStatus.check();
  });
}
