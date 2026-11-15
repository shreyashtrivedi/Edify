import { CircleCheck, CircleX, RotateCcw } from 'lucide-react';
import InlineText from './InlineText';

/**
 * Interactive multiple-choice question. The learner picks an option and immediately
 * sees whether it's right, which option was correct, and an explanation.
 *
 * Controlled component: the chosen option (`selected`, null = unanswered) is owned by
 * LessonRenderer, which saves all answers so they are still there on the next visit.
 */
export default function MCQBlock({
  question,
  options,
  answer,
  explanation,
  number,
  total,
  selected = null,
  onSelect,
}) {
  const answered = selected !== null;
  const isCorrect = selected === answer;

  function choose(index) {
    if (!answered) onSelect?.(index);
  }

  function optionClass(index) {
    if (!answered) return 'border-line hover:border-brand hover:bg-brand-soft cursor-pointer';
    if (index === answer)
      return 'border-emerald-500 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100';
    if (index === selected)
      return 'border-red-400 bg-red-50 text-red-950 dark:bg-red-950/40 dark:text-red-100';
    return 'border-line opacity-60';
  }

  return (
    <div className="my-5 rounded-xl border border-line bg-surface p-5">
      {number && (
        <p className="mb-2 text-xs font-semibold tracking-wide text-brand uppercase">
          Question {number} of {total}
        </p>
      )}
      <p className="font-medium leading-7 text-ink">
        <InlineText text={question} />
      </p>

      <div className="mt-4 space-y-2" role="radiogroup" aria-label={question}>
        {options.map((option, index) => (
          <button
            key={index}
            type="button"
            role="radio"
            aria-checked={selected === index}
            disabled={answered && index !== selected && index !== answer}
            onClick={() => choose(index)}
            className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors ${optionClass(index)}`}
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-current text-xs font-semibold opacity-70">
              {String.fromCharCode(65 + index)}
            </span>
            <span className="flex-1">
              <InlineText text={option} />
            </span>
            {answered && index === answer && <CircleCheck className="size-5 text-emerald-600" />}
            {answered && index === selected && !isCorrect && (
              <CircleX className="size-5 text-red-500" />
            )}
          </button>
        ))}
      </div>

      {answered && (
        <div className="mt-4 rounded-lg bg-subtle p-4 text-sm leading-6" aria-live="polite">
          <p className={`font-semibold ${isCorrect ? 'text-emerald-600' : 'text-red-500'}`}>
            {isCorrect ? 'Correct!' : 'Not quite.'}
          </p>
          {explanation && (
            <p className="mt-1 text-ink/90">
              <InlineText text={explanation} />
            </p>
          )}
          <button
            type="button"
            onClick={() => onSelect?.(null)}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" /> Try again
          </button>
        </div>
      )}
    </div>
  );
}
