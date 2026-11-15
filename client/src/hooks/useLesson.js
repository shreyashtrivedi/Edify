import { useCallback, useEffect, useRef, useState } from 'react';
import { getErrorMessage, isCancelled, lessonsApi } from '../utils/api';

/**
 * Loads a lesson and, if its content hasn't been generated yet, asks the backend
 * to generate it (stage 2 of the AI pipeline).
 *
 * status: 'loading'    → fetching the lesson
 *         'generating' → AI is writing the content (first visit or "Regenerate")
 *         'ready' | 'error'
 *
 * Like useCourse, each result is tagged with the request `key` it belongs to, and the
 * loading state is derived from that, not set at the start of the effect.
 *
 * In development React StrictMode runs effects twice. The first request is aborted on
 * the client, and the backend's in-flight dedupe makes the second request reuse the
 * same AI call, so we never pay twice.
 */
export function useLesson(lessonId, { onGenerated } = {}) {
  const [request, setRequest] = useState({ count: 0, force: false });
  const [result, setResult] = useState({ key: null, lesson: null, phase: null, error: null });
  const key = `${lessonId}:${request.count}`;

  // Always call the latest callback without re-running the effect when it changes.
  const onGeneratedRef = useRef(onGenerated);
  useEffect(() => {
    onGeneratedRef.current = onGenerated;
  });

  useEffect(() => {
    if (!lessonId) return;
    const controller = new AbortController();
    const options = { signal: controller.signal };

    async function load() {
      try {
        let lesson = request.force ? null : await lessonsApi.get(lessonId, options);

        if (!lesson?.isEnriched) {
          setResult({ key, lesson, phase: 'generating', error: null });
          lesson = await lessonsApi.generate(lessonId, { force: request.force }, options);
          onGeneratedRef.current?.(lesson._id);
        }
        setResult({ key, lesson, phase: 'ready', error: null });
      } catch (err) {
        if (!isCancelled(err)) setResult({ key, lesson: null, phase: 'error', error: getErrorMessage(err) });
      }
    }

    load();
    return () => controller.abort();
  }, [lessonId, key, request.force]);

  let status = result.phase;
  if (result.key !== key) status = request.force ? 'generating' : 'loading';

  const retry = useCallback(() => setRequest((r) => ({ count: r.count + 1, force: false })), []);
  const regenerate = useCallback(() => setRequest((r) => ({ count: r.count + 1, force: true })), []);

  return {
    lesson: result.key === key ? result.lesson : null,
    status,
    error: result.error,
    retry,
    regenerate,
  };
}
