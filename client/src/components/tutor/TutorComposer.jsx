import { ArrowUp } from 'lucide-react';
import { useId, useState } from 'react';

const MAX_LENGTH = 1000; // same limit as the server
const MAX_HEIGHT = 160; // px: the box grows with the text up to about 6 lines, then scrolls

/** Grows the textarea to fit its text. */
function fitHeight(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_HEIGHT)}px`;
}

/** The question box at the bottom of the chat. Enter sends, Shift+Enter adds a new line. */
export default function TutorComposer({ onSend, disabled, inputRef }) {
  const [text, setText] = useState('');
  const id = useId();

  function submit(event) {
    event.preventDefault();
    if (disabled || !text.trim()) return;
    onSend(text);
    setText('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
  }

  function handleKeyDown(event) {
    // isComposing: the learner is still building a character with an input method
    // (e.g. typing Hindi), so Enter confirms that character instead of sending.
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) submit(event);
  }

  return (
    <form onSubmit={submit} className="border-t border-line p-3">
      <div className="flex items-end gap-2 rounded-xl border border-line bg-canvas p-1.5 focus-within:border-brand">
        <label htmlFor={id} className="sr-only">
          Your question
        </label>
        <textarea
          ref={inputRef}
          id={id}
          rows={1}
          value={text}
          maxLength={MAX_LENGTH}
          onChange={(event) => {
            setText(event.target.value);
            fitHeight(event.target);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything about this lesson…"
          className="max-h-40 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm leading-6 outline-none placeholder:text-muted"
        />
        <button
          type="submit"
          disabled={disabled || !text.trim()}
          className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand text-on-brand transition-colors hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Send question"
        >
          <ArrowUp className="size-4" aria-hidden="true" />
        </button>
      </div>
      <div className="mt-1.5 flex justify-between gap-3 px-1 text-xs text-muted">
        <span>AI answers can be wrong. Double-check anything important.</span>
        {text.length > MAX_LENGTH - 200 && (
          <span className="shrink-0 tabular-nums">
            {text.length}/{MAX_LENGTH}
          </span>
        )}
      </div>
    </form>
  );
}
