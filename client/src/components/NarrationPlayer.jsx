import { Headphones, LoaderCircle, Play, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getErrorMessage, lessonsApi } from '../utils/api';
import { formatDuration } from '../utils/format';

/**
 * "Listen in Hinglish": an AI audio summary of the lesson.
 *
 * Nothing is recorded or downloaded until the learner asks for it:
 *  1. First click on a lesson without narration → the server writes a Hinglish script and
 *     records it with text-to-speech (~15-20 s, once per lesson, then stored).
 *  2. The MP3 is downloaded through axios (an <audio src> request couldn't send the login
 *     token) and played from a temporary blob: URL.
 */
export default function NarrationPlayer({ lessonId, initialNarration }) {
  const [narration, setNarration] = useState(initialNarration ?? null);
  const [status, setStatus] = useState('idle'); // idle | recording | loading | ready | error
  const [error, setError] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);

  // Free the blob's memory when the URL changes or the component unmounts.
  useEffect(() => () => audioUrl && URL.revokeObjectURL(audioUrl), [audioUrl]);

  async function handleListen() {
    setError(null);
    try {
      let current = narration;
      if (!current) {
        setStatus('recording');
        current = await lessonsApi.narrate(lessonId);
        setNarration(current);
      }
      setStatus('loading');
      const blob = await lessonsApi.narrationAudio(lessonId);
      setAudioUrl(URL.createObjectURL(blob));
      setStatus('ready');
    } catch (err) {
      setError(getErrorMessage(err));
      setStatus('error');
    }
  }

  const busy = status === 'recording' || status === 'loading';

  return (
    <section
      className="mb-8 rounded-2xl border border-brand/20 bg-brand-soft/60 p-5"
      aria-labelledby="narration-heading"
    >
      <div className="flex flex-wrap items-center gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand text-on-brand">
          <Headphones className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="narration-heading" className="font-semibold">
            Listen in Hinglish
          </h2>
          <p className="text-sm text-muted">
            {narration
              ? `${formatDuration(narration.durationSeconds)} audio summary in Hindi + English`
              : 'A one-minute audio summary in Hindi + English, recorded by AI'}
          </p>
        </div>

        {status !== 'ready' && (
          <button
            type="button"
            onClick={handleListen}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-on-brand shadow-sm hover:bg-brand-strong disabled:opacity-70"
          >
            {busy ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            ) : status === 'error' ? (
              <RotateCcw className="size-4" aria-hidden="true" />
            ) : (
              <Play className="size-4 fill-current" aria-hidden="true" />
            )}
            {status === 'recording'
              ? 'Recording…'
              : status === 'loading'
                ? 'Loading…'
                : status === 'error'
                  ? 'Try again'
                  : narration
                    ? 'Play'
                    : 'Create audio'}
          </button>
        )}
      </div>

      {status === 'recording' && (
        <p className="mt-3 text-sm text-muted" role="status">
          Writing a Hinglish script and recording it. This takes about 15 to 20 seconds, only the
          first time.
        </p>
      )}
      {status === 'error' && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}

      {status === 'ready' && audioUrl && (
        // autoPlay is allowed here: the learner just clicked a button on this page
        <audio src={audioUrl} controls autoPlay className="mt-4 w-full">
          Your browser does not support audio playback.
        </audio>
      )}

      {narration && status === 'ready' && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-muted hover:text-ink">
            Read the transcript
          </summary>
          <p className="mt-2 leading-7 whitespace-pre-line">{narration.transcript}</p>
        </details>
      )}
    </section>
  );
}
