/**
 * Single axios instance used for every backend call, plus typed endpoint helpers.
 *
 * VITE_API_URL is baked in at build time: http://localhost:5000 in development,
 * the Render URL in production (set in Vercel's environment variables).
 * Note: every VITE_* variable ends up in the public JS bundle, so never put secrets here.
 */
import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 90_000, // a sleeping Render server can take up to a minute to answer
});

/**
 * Requests that wait for Gemini (course outline, lesson, narration) get longer than the
 * server's own worst case (a 60 s attempt plus one retry), so when Gemini is slow the
 * server's explanation ("Google's AI service is overloaded…") arrives instead of a timeout.
 */
const AI_TIMEOUT = 150_000;

const NETWORK_ERROR_MESSAGE =
  "Can't reach the server. Check your internet connection and try again.";

/**
 * Authentication: AuthProvider registers Auth0's getAccessTokenSilently here after login.
 * The interceptor then adds "Authorization: Bearer <token>" to every request. The SDK
 * returns a cached token, or quietly renews it when it is about to expire.
 */
let getAccessToken = null;

export function setAccessTokenGetter(getter) {
  getAccessToken = getter;
}

api.interceptors.request.use(async (config) => {
  // Public endpoints (share links) never need the token, so they still work if renewing it fails
  if (getAccessToken && !config.skipAuth) {
    config.headers.Authorization = `Bearer ${await getAccessToken()}`;
  }
  return config;
});

/** Endpoint helpers: components never build URLs themselves. */
export const coursesApi = {
  generate: (body) =>
    api.post('/courses/generate', body, { timeout: AI_TIMEOUT }).then((res) => res.data.course),
  list: () => api.get('/courses').then((res) => res.data.courses),
  get: (id, options) => api.get(`/courses/${id}`, options).then((res) => res.data.course),
  /** The course with every generated lesson's full content (for the course PDF). */
  export: (id) => api.get(`/courses/${id}/export`).then((res) => res.data.course),
  remove: (id) => api.delete(`/courses/${id}`),
  /** Turns the public read-only link on (or returns the existing one): { token, sharedAt } */
  share: (id) => api.post(`/courses/${id}/share`).then((res) => res.data.share),
  /** Turns the public link off: it stops working immediately. */
  unshare: (id) => api.delete(`/courses/${id}/share`),
};

/** Shared courses, opened through a share link. Reading needs no login; copying does. */
const publicRequest = { skipAuth: true };
export const sharedApi = {
  course: (token, options) =>
    api.get(`/share/${token}`, { ...publicRequest, ...options }).then((res) => res.data.course),
  lesson: (token, lessonId, options) =>
    api
      .get(`/share/${token}/lessons/${lessonId}`, { ...publicRequest, ...options })
      .then((res) => res.data.lesson),
  /** Every generated lesson's content (for the course PDF). */
  export: (token) =>
    api.get(`/share/${token}/export`, publicRequest).then((res) => res.data.course),
  /** Copies the course into the logged-in user's library and returns the new course. */
  copy: (token) => api.post(`/share/${token}/copy`).then((res) => res.data.course),
};

export const lessonsApi = {
  get: (id, options) => api.get(`/lessons/${id}`, options).then((res) => res.data.lesson),
  generate: (id, { force = false } = {}, options) =>
    api
      .post(`/lessons/${id}/generate`, { force }, { timeout: AI_TIMEOUT, ...options })
      .then((res) => res.data.lesson),
  /** Saves completion and/or quiz answers: { completed?, quizAnswers? }. The server grades the quiz. */
  saveProgress: (id, body) =>
    api.put(`/lessons/${id}/progress`, body).then((res) => res.data.progress),
  /** Records the Hinglish narration (once; later calls return the stored one). */
  narrate: (id) =>
    api
      .post(`/lessons/${id}/narration`, undefined, { timeout: AI_TIMEOUT })
      .then((res) => res.data.narration),
  /** The narration MP3 as a Blob. Fetched through axios so the auth token is sent. */
  narrationAudio: (id) =>
    api.get(`/lessons/${id}/narration/audio`, { responseType: 'blob' }).then((res) => res.data),
};

/**
 * Reads a streamed NDJSON body (one JSON object per line), calling `onEvent` for each object
 * as soon as its line is complete. A network chunk can end in the middle of a line, so the
 * unfinished part is kept until the rest arrives.
 */
async function readNdjson(body, onEvent) {
  const reader = body.pipeThrough(new TextDecoderStream()).getReader();
  let buffered = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    buffered += value;
    const lines = buffered.split('\n');
    buffered = lines.pop(); // the last piece may be an incomplete line
    for (const line of lines) {
      if (line.trim()) onEvent(JSON.parse(line));
    }
  }
}

/**
 * Asks the lesson tutor a question and streams the answer.
 *
 * Uses fetch instead of axios: in the browser, axios only hands over the response once it
 * is complete, while fetch exposes the body as a stream we can read piece by piece.
 *
 * @param {string} lessonId
 * @param {string} question
 * @param {object} [options]
 * @param {(text: string) => void} [options.onDelta]  called with each new piece of the answer
 * @param {AbortSignal} [options.signal]              abort to stop (the server stops the AI too)
 * @returns {Promise<object[]>} the saved question + answer messages
 */
async function askTutor(lessonId, question, { onDelta, signal } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (getAccessToken) headers.Authorization = `Bearer ${await getAccessToken()}`;

  let response;
  try {
    response = await fetch(`${API_BASE_URL}/api/lessons/${lessonId}/tutor`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ question }),
      signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error(NETWORK_ERROR_MESSAGE);
  }

  // Errors before the answer starts (validation, rate limit, AI down) are normal JSON errors
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      body?.error?.message || `The tutor couldn't answer (error ${response.status}).`,
    );
  }

  let saved = null;
  await readNdjson(response.body, (event) => {
    if (event.type === 'delta') onDelta?.(event.text);
    else if (event.type === 'done') saved = event.messages;
    else if (event.type === 'error') throw new Error(event.error.message);
  });
  if (!saved) throw new Error('The answer was cut off. Please try again.');
  return saved;
}

/** "Ask a doubt" tutor for a lesson. */
export const tutorApi = {
  /** The saved conversation: [{ _id, role: 'user' | 'tutor', text, createdAt }] */
  chat: (lessonId) => api.get(`/lessons/${lessonId}/tutor`).then((res) => res.data.messages),
  clear: (lessonId) => api.delete(`/lessons/${lessonId}/tutor`),
  ask: askTutor,
};

export const usersApi = {
  syncProfile: (profile) => api.put('/users/me', profile).then((res) => res.data.user),
  me: () => api.get('/users/me').then((res) => res.data.user),
};

/** True when a request was cancelled on purpose (e.g. the component unmounted). */
export const isCancelled = (error) => axios.isCancel(error) || error?.name === 'AbortError';

/**
 * Turns any axios error into a human-friendly message for the UI.
 * The backend always responds with { error: { message } } on failure.
 */
export function getErrorMessage(error) {
  if (error?.response?.data?.error?.message) return error.response.data.error.message;
  // Auth0 SDK errors while renewing the token, e.g. the session ended
  if (error?.error === 'login_required' || error?.error === 'missing_refresh_token') {
    return 'Your session has expired. Please log in again.';
  }
  if (error?.code === 'ECONNABORTED') return 'The request timed out. Please try again.';
  if (error?.message === 'Network Error') return NETWORK_ERROR_MESSAGE;
  return error?.message || 'Something went wrong.';
}
