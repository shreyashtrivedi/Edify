import { MessageCircleQuestionMark } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { useTutor } from '../../hooks/useTutor';
import TutorPanel from './TutorPanel';

/**
 * "Ask a doubt" on a lesson page: a floating button that opens the tutor chat.
 * Render it with key={lessonId} so every lesson gets its own fresh chat state.
 */
export default function LessonTutor({ lessonId, lessonTitle }) {
  const tutor = useTutor(lessonId);
  const [open, setOpen] = useState(false);
  const launcherRef = useRef(null);
  const panelId = useId();

  function openPanel() {
    setOpen(true);
    if (tutor.loadStatus === 'idle') tutor.load(); // load the saved chat on first open only
  }

  function closePanel() {
    setOpen(false);
    launcherRef.current?.focus(); // keyboard users continue where they were
  }

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        onClick={openPanel}
        aria-expanded={open}
        aria-controls={panelId}
        className="fixed right-4 bottom-4 z-30 inline-flex items-center gap-2 rounded-full bg-brand py-3 pr-5 pl-4 text-sm font-semibold text-on-brand shadow-lg shadow-brand/25 transition-colors hover:bg-brand-strong sm:right-6 sm:bottom-6"
      >
        <MessageCircleQuestionMark className="size-5" aria-hidden="true" />
        Ask a doubt
        {tutor.asking && !open && (
          // An answer is still being written while the panel is closed
          <span
            className="absolute -top-0.5 -right-0.5 size-3 rounded-full bg-emerald-400 ring-2 ring-canvas motion-safe:animate-pulse"
            aria-hidden="true"
          />
        )}
      </button>

      <TutorPanel
        id={panelId}
        open={open}
        onClose={closePanel}
        lessonTitle={lessonTitle}
        tutor={tutor}
      />
    </>
  );
}
