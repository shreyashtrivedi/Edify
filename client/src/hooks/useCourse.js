import { useCallback, useEffect, useState } from 'react';
import { coursesApi, getErrorMessage, isCancelled } from '../utils/api';

/**
 * Loads one course (modules + lesson titles).
 *
 * Each result remembers which request (`key`) it belongs to, and "loading" is *derived*:
 * we're loading whenever the latest result isn't for the current key. That avoids
 * resetting state synchronously inside the effect (an extra render).
 * The AbortController cancels the request if the user navigates away mid-load,
 * so a slow response can never overwrite newer data.
 */
export function useCourse(courseId) {
  const [reloadCount, setReloadCount] = useState(0);
  const [result, setResult] = useState({ key: null, course: null, error: null });
  const key = `${courseId}:${reloadCount}`;

  useEffect(() => {
    const controller = new AbortController();

    coursesApi
      .get(courseId, { signal: controller.signal })
      .then((course) => setResult({ key, course, error: null }))
      .catch((err) => {
        if (!isCancelled(err)) setResult({ key, course: null, error: getErrorMessage(err) });
      });

    return () => controller.abort();
  }, [courseId, key]);

  const status = result.key !== key ? 'loading' : result.error ? 'error' : 'ready';
  // Keep showing the previous data while reloading the same course
  const course = result.course?._id === courseId ? result.course : null;

  const reload = useCallback(() => setReloadCount((count) => count + 1), []);

  /** Marks a lesson as generated locally, so outlines update without refetching. */
  const markLessonEnriched = useCallback((lessonId) => {
    setResult((current) => ({
      ...current,
      course: current.course && {
        ...current.course,
        modules: current.course.modules.map((module) => ({
          ...module,
          lessons: module.lessons.map((lesson) =>
            lesson._id === lessonId ? { ...lesson, isEnriched: true } : lesson,
          ),
        })),
      },
    }));
  }, []);

  return { course, status, error: result.error, reload, markLessonEnriched };
}
