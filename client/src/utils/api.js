/**
 * Single axios instance used for every backend call.
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
 * Turns any axios error into a human-friendly message for the UI.
 * The backend always responds with { error: { message } } on failure.
 */
export function getErrorMessage(error) {
  if (error?.response?.data?.error?.message) return error.response.data.error.message;
  if (error?.code === 'ECONNABORTED') return 'The request timed out. Please try again.';
  if (error?.message === 'Network Error') return 'Cannot reach the server. Is it running?';
  return error?.message || 'Something went wrong.';
}
