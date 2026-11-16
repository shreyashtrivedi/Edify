import { useAuth0 } from '@auth0/auth0-react';
import { ArrowRight, CopyPlus, Link2, LoaderCircle } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useCourses } from '../../hooks/useCourses';
import { getErrorMessage, sharedApi } from '../../utils/api';
import { coursePath } from '../../utils/paths';

const buttonClass =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-on-brand shadow-sm hover:bg-brand-strong disabled:opacity-70 max-sm:w-full';

/**
 * Top of every shared page: says it's a read-only shared course, and offers the next step:
 * - your own course → a link to the real (editable) version;
 * - logged in       → "Save a copy" into your library;
 * - logged out      → log in, then come back here to save a copy.
 */
export default function SharedBanner({ course, token }) {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();
  const { courses, refresh } = useCourses();
  const navigate = useNavigate();
  const location = useLocation();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const isOwnCourse = courses.some((own) => own._id === course._id);

  async function saveCopy() {
    setSaving(true);
    setError(null);
    try {
      const copy = await sharedApi.copy(token);
      refresh(); // the sidebar lists the new course
      navigate(coursePath(copy._id));
    } catch (failure) {
      setError(getErrorMessage(failure));
      setSaving(false);
    }
  }

  let action = null;
  if (isOwnCourse) {
    action = (
      <Link to={coursePath(course._id)} className={buttonClass}>
        This is your course: open it <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    );
  } else if (isAuthenticated) {
    action = (
      <button type="button" onClick={saveCopy} disabled={saving} className={buttonClass}>
        {saving ? (
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <CopyPlus className="size-4" aria-hidden="true" />
        )}
        {saving ? 'Saving a copy…' : 'Save a copy'}
      </button>
    );
  } else if (!isLoading) {
    action = (
      <button
        type="button"
        onClick={() => loginWithRedirect({ appState: { returnTo: location.pathname } })}
        className={buttonClass}
      >
        <CopyPlus className="size-4" aria-hidden="true" /> Log in to save a copy
      </button>
    );
  }

  return (
    <div className="mb-8 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-brand/25 bg-brand-soft px-5 py-4">
      <Link2 className="size-5 shrink-0 text-brand" aria-hidden="true" />
      {/* basis-60: the text keeps room; on phones the button wraps below it */}
      <div className="min-w-0 flex-1 basis-60 text-sm">
        <p className="font-semibold">Shared course · read-only</p>
        <p className="text-muted">
          {isOwnCourse
            ? 'This is how visitors see your course.'
            : 'Someone shared this with you. Answers you give here aren’t saved; save a copy to track your progress.'}
        </p>
      </div>
      {action}
      {error && (
        <p className="w-full text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
