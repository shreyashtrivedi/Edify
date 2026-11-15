import { useCallback, useEffect, useRef, useState } from 'react';
import { getErrorMessage, lessonsApi } from '../utils/api';

/**
 * The learner's progress in one lesson, plus save().
 *
 * - Starts from `lesson.progress` (sent with the lesson by the server).
 * - Saves are queued and sent ONE AT A TIME: answering three questions quickly fires three
 *   saves, and if they ran in parallel an older one could finish last and overwrite a newer one.
 * - State is tagged with the lesson's id + updatedAt, so a regenerated lesson starts fresh
 *   (same "derived state" pattern as useCourse/useLesson).
 */
export function useLessonProgress(lesson, { onSaved } = {}) {
  const key = lesson ? `${lesson._id}:${lesson.updatedAt}` : null;
  const [state, setState] = useState({ key: null, progress: null, saving: false, error: null });
  const current =
    state.key === key
      ? state
      : { key, progress: lesson?.progress ?? null, saving: false, error: null };

  const queue = useRef(Promise.resolve());
  const onSavedRef = useRef(onSaved);
  useEffect(() => {
    onSavedRef.current = onSaved;
  });

  const lessonId = lesson?._id;
  const save = useCallback(
    (body) => {
      setState((s) => ({
        ...(s.key === key ? s : { key, progress: null }),
        saving: true,
        error: null,
      }));
      queue.current = queue.current.then(async () => {
        try {
          const progress = await lessonsApi.saveProgress(lessonId, body);
          setState({ key, progress, saving: false, error: null });
          onSavedRef.current?.(progress);
        } catch (err) {
          setState((s) => ({ ...s, key, saving: false, error: getErrorMessage(err) }));
        }
      });
      return queue.current;
    },
    [key, lessonId],
  );

  return {
    progress: current.progress ?? lesson?.progress ?? null,
    saving: current.saving,
    error: current.error,
    save,
  };
}
