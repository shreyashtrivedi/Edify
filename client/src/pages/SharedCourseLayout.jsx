import { Suspense } from 'react';
import { Link, Outlet, useParams } from 'react-router';
import SharedBanner from '../components/share/SharedBanner';
import ErrorMessage from '../components/ui/ErrorMessage';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useAsyncData } from '../hooks/useAsyncData';
import { sharedApi } from '../utils/api';

/**
 * Parent route for /share/:token/*. Public: no login needed.
 * Loads the shared course once and gives it to the overview and lesson pages via
 * <Outlet context>, like CourseLayout does for your own courses.
 */
export default function SharedCourseLayout() {
  const { token } = useParams();
  const {
    data: course,
    status,
    error,
    reload,
  } = useAsyncData(`share:${token}`, (signal) => sharedApi.course(token, { signal }));

  if (status === 'loading') return <LoadingSpinner label="Opening shared course…" fullPage />;

  if (status === 'error') {
    return (
      <div className="mx-auto max-w-xl py-16">
        <ErrorMessage title="Couldn't open this shared course" message={error} onRetry={reload} />
        <p className="mt-4 text-sm text-muted">
          The owner may have turned the link off or deleted the course. Ask them for a new link.
        </p>
        <Link to="/" className="mt-6 inline-block text-sm font-medium text-brand hover:underline">
          ← Go to Edify
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* React 19 moves this into <head>: shared courses are for people with the link, not search engines */}
      <meta name="robots" content="noindex" />
      <SharedBanner course={course} token={token} />
      {/* Own boundary, so the banner stays put while a page downloads (pages/lazyPages.js) */}
      <Suspense fallback={<LoadingSpinner fullPage />}>
        <Outlet context={{ course, token }} />
      </Suspense>
    </>
  );
}
