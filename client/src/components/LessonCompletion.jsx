import { CircleCheck, LoaderCircle } from 'lucide-react';

/** Bottom-of-lesson card: mark the lesson complete (or undo), with the saved quiz score. */
export default function LessonCompletion({ progress, saving, error, onToggle }) {
  const completed = Boolean(progress?.completed);
  const hasScore =
    progress?.quizTotal > 0 && progress.quizAnswers?.some((answer) => answer !== null);

  return (
    <section
      className={`mt-12 flex flex-wrap items-center gap-4 rounded-2xl border p-5 ${
        completed
          ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30'
          : 'border-line bg-surface'
      }`}
      aria-live="polite"
    >
      <CircleCheck
        className={`size-8 shrink-0 ${completed ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted opacity-40'}`}
        aria-hidden="true"
      />
      {/* basis-48: the text keeps room; on phones the button wraps below it */}
      <div className="min-w-0 flex-1 basis-48">
        <p className="font-semibold">{completed ? 'Lesson completed' : 'Finished this lesson?'}</p>
        <p className="text-sm text-muted">
          {hasScore && `Quiz score: ${progress.quizScore}/${progress.quizTotal}. `}
          {completed
            ? 'Nice work. Keep going with the next lesson.'
            : 'Answering every quiz question also marks it complete.'}
        </p>
        {error && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
            Couldn&apos;t save your progress: {error}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onToggle(!completed)}
        disabled={saving}
        className={
          completed
            ? 'text-sm font-medium text-muted hover:text-ink disabled:opacity-50'
            : 'inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-on-brand shadow-sm hover:bg-brand-strong disabled:opacity-70 max-sm:w-full'
        }
      >
        {saving && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
        {completed ? 'Mark as not complete' : 'Mark as complete'}
      </button>
    </section>
  );
}
