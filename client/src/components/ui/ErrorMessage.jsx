import { CircleAlert, RotateCcw } from 'lucide-react';

/** Friendly error box with an optional "Try again" action. */
export default function ErrorMessage({ title = 'Something went wrong', message, onRetry }) {
  return (
    <div
      className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
      role="alert"
    >
      <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div className="flex-1">
        <p className="font-semibold">{title}</p>
        {message && <p className="mt-1 text-sm opacity-90">{message}</p>}
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700"
          >
            <RotateCcw className="size-4" aria-hidden="true" /> Try again
          </button>
        )}
      </div>
    </div>
  );
}
