import { MessageCircleQuestionMark, Sparkles, Trash2, X } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import ErrorMessage from '../ui/ErrorMessage';
import LoadingSpinner from '../ui/LoadingSpinner';
import TutorComposer from './TutorComposer';
import TutorMessage from './TutorMessage';

const SUGGESTIONS = [
  'Explain this lesson in simpler words',
  'Give me a real-world example',
  'What mistakes do beginners make here?',
];

function EmptyState({ onPick, disabled }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center py-6 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand">
        <Sparkles className="size-6" aria-hidden="true" />
      </span>
      <h3 className="mt-4 font-display text-lg font-semibold">Stuck on something?</h3>
      <p className="mt-1 max-w-xs text-sm text-muted">
        Ask anything about this lesson. The tutor has read it and remembers your chat. English or
        Hinglish, both work.
      </p>
      <div className="mt-6 flex w-full flex-col gap-2">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            disabled={disabled}
            onClick={() => onPick(suggestion)}
            className="rounded-xl border border-line px-3 py-2 text-left text-sm transition-colors hover:border-brand hover:bg-brand-soft hover:text-brand disabled:opacity-50"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * The chat panel: a full-screen sheet on phones, a column on the right on larger screens.
 * It stays mounted while closed (just `hidden`), so an answer keeps streaming in the background.
 */
export default function TutorPanel({ id, open, onClose, lessonTitle, tutor }) {
  const { messages, loadStatus, loadError, load, ask, asking, clear, error, announcement } = tutor;
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const followAnswer = useRef(true); // false once the learner scrolls up to reread something
  const [confirmingClear, setConfirmingClear] = useState(false);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Keep the newest text in view while the answer streams in, unless the learner scrolled up
  useLayoutEffect(() => {
    const list = listRef.current;
    if (open && list && followAnswer.current) list.scrollTop = list.scrollHeight;
  }, [messages, open]);

  function handleScroll() {
    const list = listRef.current;
    followAnswer.current = list.scrollHeight - list.scrollTop - list.clientHeight < 80;
  }

  function send(question) {
    followAnswer.current = true;
    ask(question);
  }

  async function confirmClear() {
    setConfirmingClear(false);
    await clear();
    inputRef.current?.focus(); // the clear button is gone, so put focus somewhere useful
  }

  return (
    <section
      id={id}
      hidden={!open}
      aria-label="Ask a doubt"
      onKeyDown={(event) => event.key === 'Escape' && onClose()}
      className="fixed inset-0 z-50 flex flex-col bg-surface sm:inset-y-0 sm:right-0 sm:left-auto sm:w-[26rem] sm:border-l sm:border-line sm:shadow-2xl"
    >
      <header className="flex items-center gap-3 border-b border-line px-4 py-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
          <MessageCircleQuestionMark className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">Ask a doubt</h2>
          <p className="truncate text-xs text-muted">{lessonTitle}</p>
        </div>

        {messages.length > 0 &&
          !asking &&
          (confirmingClear ? (
            <div className="flex items-center gap-1 text-xs">
              <span className="text-muted">Clear chat?</span>
              <button
                type="button"
                onClick={confirmClear}
                className="rounded-md px-2 py-1 font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setConfirmingClear(false)}
                className="rounded-md px-2 py-1 text-muted hover:bg-subtle hover:text-ink"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingClear(true)}
              className="rounded-lg p-2 text-muted hover:bg-subtle hover:text-ink"
              title="Clear chat"
            >
              <Trash2 className="size-4" aria-hidden="true" />
              <span className="sr-only">Clear chat</span>
            </button>
          ))}
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-muted hover:bg-subtle hover:text-ink"
          title="Close (Esc)"
        >
          <X className="size-5" aria-hidden="true" />
          <span className="sr-only">Close</span>
        </button>
      </header>

      <div ref={listRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 py-5">
        {loadStatus === 'loading' && <LoadingSpinner label="Loading your chat…" />}
        {loadStatus === 'error' && (
          <ErrorMessage title="Couldn't load your chat" message={loadError} onRetry={load} />
        )}
        {loadStatus === 'ready' && messages.length === 0 && (
          <EmptyState onPick={send} disabled={asking} />
        )}
        {messages.length > 0 && (
          <ol className="space-y-6" aria-label="Conversation">
            {messages.map((message) => (
              <TutorMessage key={message._id} message={message} />
            ))}
          </ol>
        )}
        {error && (
          <div className="mt-5">
            <ErrorMessage
              title="The tutor couldn't answer"
              message={error.message}
              onRetry={error.retryQuestion ? () => send(error.retryQuestion) : undefined}
            />
          </div>
        )}
      </div>

      {/* Streaming text isn't announced word by word (too noisy); this says when it's done */}
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      <TutorComposer
        inputRef={inputRef}
        onSend={send}
        disabled={asking || loadStatus !== 'ready'}
      />
    </section>
  );
}
