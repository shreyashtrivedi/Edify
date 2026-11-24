import { CloudOff, LoaderCircle, RotateCcw } from 'lucide-react';
import { useServerStatus } from '../hooks/useServerStatus';
import { checkServer } from '../utils/serverStatus';

/**
 * Explains a slow first load at the top of every page. The API's free hosting sleeps when
 * nobody uses it, and without this the visitor would just see a spinner for up to a minute.
 * The live region stays mounted (empty) so screen readers announce the message when it appears.
 */
export default function ServerWakingNotice() {
  const status = useServerStatus();

  return (
    <div role="status">
      {status === 'waking' && (
        <div className="mb-8 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
          <LoaderCircle
            className="mt-0.5 size-4 shrink-0 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
          <p>
            <span className="font-semibold">Waking up the server…</span> Edify runs on free hosting
            that sleeps when nobody is using it, so this first load can take up to a minute. After
            that, everything is quick.
          </p>
        </div>
      )}

      {status === 'offline' && (
        <div className="mb-8 flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
          <CloudOff className="size-4 shrink-0" aria-hidden="true" />
          <p className="flex-1 basis-60">
            <span className="font-semibold">Can’t reach the server.</span> Check your internet
            connection, then try again.
          </p>
          <button
            type="button"
            onClick={checkServer}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 font-semibold text-white hover:bg-red-700 max-sm:w-full max-sm:justify-center"
          >
            <RotateCcw className="size-4" aria-hidden="true" /> Try again
          </button>
        </div>
      )}
    </div>
  );
}
