import { ArrowRight, Sparkles } from 'lucide-react';
import { useState } from 'react';

const LEVELS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

const EXAMPLES = [
  'Intro to React Hooks',
  'Basics of Copyright Law',
  'Machine Learning fundamentals',
  'Personal finance for students',
  'The French Revolution',
];

const MAX_LENGTH = 500;

/**
 * Captures the topic + options and hands them to `onSubmit`.
 * The parent owns the API call; this component only owns form state.
 */
export default function PromptForm({ onSubmit, disabled }) {
  const [prompt, setPrompt] = useState('');
  const [level, setLevel] = useState('beginner');
  const [moduleCount, setModuleCount] = useState('');

  const trimmed = prompt.trim();
  const canSubmit = trimmed.length >= 3 && !disabled;

  function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit) return;
    onSubmit({ prompt: trimmed, level, ...(moduleCount && { moduleCount: Number(moduleCount) }) });
  }

  // Ctrl/Cmd + Enter submits from inside the textarea
  function handleKeyDown(event) {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) handleSubmit(event);
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-line bg-surface p-2 shadow-sm">
      <label htmlFor="topic" className="sr-only">
        What do you want to learn?
      </label>
      <textarea
        id="topic"
        value={prompt}
        onChange={(event) => setPrompt(event.target.value.slice(0, MAX_LENGTH))}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        rows={3}
        placeholder="e.g. Intro to React Hooks, Basics of Copyright Law, How vaccines work…"
        className="block w-full resize-none rounded-xl bg-transparent px-4 py-3 text-lg placeholder:text-muted/70 focus:outline-none disabled:opacity-60"
      />

      <div className="flex flex-wrap items-center gap-3 border-t border-line px-2 pt-3 pb-1">
        <fieldset className="flex rounded-lg bg-subtle p-1" disabled={disabled}>
          <legend className="sr-only">Level</legend>
          {LEVELS.map((option) => (
            <label
              key={option.value}
              className={`cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                level === option.value ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
              }`}
            >
              <input
                type="radio"
                name="level"
                value={option.value}
                checked={level === option.value}
                onChange={() => setLevel(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          ))}
        </fieldset>

        <label className="flex items-center gap-2 text-sm text-muted">
          Modules
          <select
            value={moduleCount}
            onChange={(event) => setModuleCount(event.target.value)}
            disabled={disabled}
            className="rounded-lg border border-line bg-surface px-2 py-1.5 text-ink"
          >
            <option value="">Auto</option>
            {[3, 4, 5, 6].map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </select>
        </label>

        <span className="ml-auto hidden text-xs text-muted sm:block">
          {prompt.length}/{MAX_LENGTH}
        </span>

        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-on-brand shadow-sm transition-colors hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          <Sparkles className="size-4" aria-hidden="true" />
          Generate course
          <ArrowRight className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="flex flex-wrap gap-2 px-2 pt-3 pb-2">
        <span className="text-xs text-muted">Try:</span>
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            disabled={disabled}
            onClick={() => setPrompt(example)}
            className="rounded-full border border-line px-2.5 py-0.5 text-xs text-muted transition-colors hover:border-brand hover:text-brand"
          >
            {example}
          </button>
        ))}
      </div>
    </form>
  );
}
