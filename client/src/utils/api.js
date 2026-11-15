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
  timeout: 90_000, // AI generation + Render cold starts can be slow
});

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
  if (getAccessToken) {
    config.headers.Authorization = `Bearer ${await getAccessToken()}`;
  }
  return config;
});

/** Endpoint helpers: components never build URLs themselves. */
export const coursesApi = {
  generate: (body) => api.post('/courses/generate', body).then((res) => res.data.course),
  list: () => api.get('/courses').then((res) => res.data.courses),
  get: (id, options) => api.get(`/courses/${id}`, options).then((res) => res.data.course),
  remove: (id) => api.delete(`/courses/${id}`),
};

export const lessonsApi = {
  get: (id, options) => api.get(`/lessons/${id}`, options).then((res) => res.data.lesson),
  generate: (id, { force = false } = {}, options) =>
    api.post(`/lessons/${id}/generate`, { force }, options).then((res) => res.data.lesson),
};

export const usersApi = {
  syncProfile: (profile) => api.put('/users/me', profile).then((res) => res.data.user),
  me: () => api.get('/users/me').then((res) => res.data.user),
};

/** True when a request was cancelled on purpose (e.g. the component unmounted). */
export const isCancelled = (error) => axios.isCancel(error);

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
  if (error?.message === 'Network Error') return 'Cannot reach the server. Is it running?';
  return error?.message || 'Something went wrong.';
}
