import { Suspense } from 'react';
import { Link, Outlet, useParams } from 'react-router';
import ErrorMessage from '../components/ui/ErrorMessage';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useCourse } from '../hooks/useCourse';

/**
 * Parent route for /courses/:courseId/*. Loads the course ONCE and shares it with the
 * course overview and every lesson page via <Outlet context>, so moving between
 * lessons never re-fetches the course.
 */
export default function CourseLayout() {
  const { courseId } = useParams();
  const courseState = useCourse(courseId);

  if (courseState.status === 'loading' && !courseState.course) {
    return <LoadingSpinner label="Loading course…" fullPage />;
  }

  if (courseState.status === 'error') {
    return (
      <div className="mx-auto max-w-xl py-16">
        <ErrorMessage
          title="Couldn't open this course"
          message={courseState.error}
          onRetry={courseState.reload}
        />
        <Link to="/" className="mt-6 inline-block text-sm font-medium text-brand hover:underline">
          ← Back to home
        </Link>
      </div>
    );
  }

  return (
    // The overview and lesson pages are downloaded on demand (pages/lazyPages.js)
    <Suspense fallback={<LoadingSpinner fullPage />}>
      <Outlet context={courseState} />
    </Suspense>
  );
}
