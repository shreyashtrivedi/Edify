import { Check, CircleCheck, Copy, ExternalLink, Link2, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { coursesApi, getErrorMessage } from '../../utils/api';
import { flattenLessons, sharePath, shareUrl } from '../../utils/paths';

const WHAT_VISITORS_GET = [
  "They see the outline and every lesson you've already opened.",
  "They can't change anything, and never see your progress or chats.",
  'Logged-in visitors can save their own copy to learn with.',
];

/**
 * "Share" button on the owner's course page, with a dialog to create, copy or turn off the link.
 *
 * Uses the native <dialog> element with showModal(): the browser then traps focus inside,
 * closes it on Escape, makes the page behind inert and returns focus to the button. All the
 * accessibility of a modal, without writing it ourselves.
 */
export default function ShareCourse({ course, onShareChange }) {
  const dialogRef = useRef(null);
  const linkRef = useRef(null);
  const createRef = useRef(null);
  const titleId = useId();
  const linkId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [confirmingStop, setConfirmingStop] = useState(false);
  const focusAfterChange = useRef(null); // element ref to focus once the link appears/disappears

  const token = course.shareToken;
  const unwritten = flattenLessons(course).filter(({ lesson }) => !lesson.isEnriched).length;

  // The clicked button is replaced when the link is created or removed, so keyboard focus would
  // fall back to the page. Once React has rendered the change, move focus to what replaced it.
  useEffect(() => {
    focusAfterChange.current?.current?.focus();
    focusAfterChange.current = null;
  }, [token]);

  function open() {
    setError(null);
    setConfirmingStop(false);
    dialogRef.current.showModal();
  }

  const close = () => dialogRef.current.close();

  async function run(action, focusAfter) {
    setBusy(true);
    setError(null);
    try {
      focusAfterChange.current = focusAfter;
      await action();
    } catch (failure) {
      focusAfterChange.current = null;
      setError(getErrorMessage(failure));
    } finally {
      setBusy(false);
    }
  }

  const createLink = () =>
    run(async () => {
      const share = await coursesApi.share(course._id);
      onShareChange({ shareToken: share.token, sharedAt: share.sharedAt });
    }, linkRef);

  const stopSharing = () =>
    run(async () => {
      await coursesApi.unshare(course._id);
      setConfirmingStop(false);
      onShareChange({ shareToken: undefined, sharedAt: undefined });
    }, createRef);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl(token));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (permissions / insecure page): select the text so it can be copied by hand
      linkRef.current?.select();
      setError("Couldn't copy automatically. The link is selected: press Ctrl+C (or ⌘+C).");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-haspopup="dialog"
        className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-muted hover:border-brand hover:text-brand"
      >
        <Link2 className="size-4" aria-hidden="true" />
        {token ? 'Shared' : 'Share'}
        {token && <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden="true" />}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        // A click on the backdrop lands on the <dialog> itself (its content is the inner div)
        onClick={(event) => event.target === event.currentTarget && close()}
        className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
      >
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id={titleId} className="font-display text-xl font-semibold">
                Share this course
              </h2>
              <p className="mt-1 text-sm text-muted">
                Anyone with the link can read it. No account needed.
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              className="-m-1 rounded-lg p-1.5 text-muted hover:bg-subtle hover:text-ink"
            >
              <X className="size-5" aria-hidden="true" />
              <span className="sr-only">Close</span>
            </button>
          </div>

          <ul className="mt-5 space-y-2 text-sm">
            {WHAT_VISITORS_GET.map((line) => (
              <li key={line} className="flex gap-2">
                <CircleCheck className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
                {line}
              </li>
            ))}
          </ul>

          {token ? (
            <div className="mt-6">
              <label
                htmlFor={linkId}
                className="text-xs font-semibold tracking-wide text-muted uppercase"
              >
                Share link
              </label>
              <div className="mt-1.5 flex gap-2">
                <input
                  ref={linkRef}
                  id={linkId}
                  readOnly
                  value={shareUrl(token)}
                  onFocus={(event) => event.target.select()}
                  className="min-w-0 flex-1 rounded-lg border border-line bg-canvas px-3 py-2 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={copyLink}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-on-brand hover:bg-brand-strong"
                >
                  {copied ? (
                    <Check className="size-4" aria-hidden="true" />
                  ) : (
                    <Copy className="size-4" aria-hidden="true" />
                  )}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              {unwritten > 0 && (
                <p className="mt-2 text-xs text-muted">
                  {unwritten} {unwritten === 1 ? 'lesson hasn’t' : 'lessons haven’t'} been written
                  yet. Visitors see {unwritten === 1 ? 'it' : 'them'} as &ldquo;not written
                  yet&rdquo; until you open {unwritten === 1 ? 'it' : 'them'}.
                </p>
              )}

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
                <a
                  href={sharePath(token)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 font-medium text-brand hover:underline"
                >
                  <ExternalLink className="size-4" aria-hidden="true" /> Open as a visitor
                </a>
                {confirmingStop ? (
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-muted">The link will stop working.</span>
                    <button
                      type="button"
                      onClick={stopSharing}
                      disabled={busy}
                      className="font-semibold text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
                    >
                      {busy ? 'Stopping…' : 'Stop sharing'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingStop(false)}
                      className="text-muted hover:text-ink"
                    >
                      Cancel
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingStop(true)}
                    className="text-muted hover:text-red-600 dark:hover:text-red-400"
                  >
                    Stop sharing…
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              <button
                ref={createRef}
                type="button"
                onClick={createLink}
                disabled={busy}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-on-brand hover:bg-brand-strong disabled:opacity-70"
              >
                <Link2 className="size-4" aria-hidden="true" />
                {busy ? 'Creating link…' : 'Create share link'}
              </button>
              <p className="mt-2 text-center text-xs text-muted">
                You can turn the link off at any time. Turning it on again makes a new link.
              </p>
            </>
          )}

          {error && (
            <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          )}
        </div>
      </dialog>
    </>
  );
}
