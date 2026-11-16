import { useCallback, useEffect, useRef, useState } from 'react';
import { getErrorMessage, isCancelled } from '../utils/api';

/**
 * Loads data with `load(signal)` whenever `key` changes. Same pattern as useCourse:
 * - "loading" is derived (the latest result isn't for the current key), not set in the effect;
 * - an AbortController cancels a request that is no longer needed (the user navigated away),
 *   so a slow response can never overwrite newer data.
 *
 * `key` must change whenever `load` would fetch something different (include the ids in it).
 * Returns { data, status: 'loading' | 'ready' | 'error', error, reload }.
 */
export function useAsyncData(key, load) {
  const [reloadCount, setReloadCount] = useState(0);
  const [result, setResult] = useState({ key: null, data: null, error: null });
  const requestKey = `${key}:${reloadCount}`;

  // Always call the latest `load` without re-running the effect on every render
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    const controller = new AbortController();
    loadRef
      .current(controller.signal)
      .then((data) => setResult({ key: requestKey, data, error: null }))
      .catch((error) => {
        if (!isCancelled(error)) {
          setResult({ key: requestKey, data: null, error: getErrorMessage(error) });
        }
      });
    return () => controller.abort();
  }, [requestKey]);

  const status = result.key !== requestKey ? 'loading' : result.error ? 'error' : 'ready';
  const reload = useCallback(() => setReloadCount((count) => count + 1), []);

  return {
    data: result.key === requestKey ? result.data : null,
    status,
    error: result.error,
    reload,
  };
}
