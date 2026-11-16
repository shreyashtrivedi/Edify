import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import CourseCard from '../components/course/CourseCard';
import GeneratingCourse from '../components/GeneratingCourse';
import Landing from '../components/home/Landing';
import PromptForm from '../components/PromptForm';
import ErrorMessage from '../components/ui/ErrorMessage';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Skeleton from '../components/ui/Skeleton';
import { useCourses } from '../hooks/useCourses';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { coursesApi, getErrorMessage } from '../utils/api';
import { coursePath } from '../utils/paths';
import { preload } from './lazyPages';

/** Logged out: the landing page. Logged in: the course generator and the user's courses. */
export default function HomePage() {
  useDocumentTitle(null);
  const { isAuthenticated, isLoading } = useAuth0();

  if (isLoading) return <LoadingSpinner fullPage />;
  return isAuthenticated ? <CourseGenerator /> : <Landing />;
}

function CourseGenerator() {
  const navigate = useNavigate();
  const { courses, status, addCourse, refresh } = useCourses();
  const [generating, setGenerating] = useState(null); // the topic being generated
  const [error, setError] = useState(null);

  useEffect(() => {
    preload.course(); // a course page is the next stop (opened or just generated): fetch it now
  }, []);

  async function handleGenerate(input) {
    setGenerating(input.prompt);
    setError(null);
    try {
      const course = await coursesApi.generate(input);
      addCourse(course);
      navigate(coursePath(course._id));
    } catch (err) {
      setError(getErrorMessage(err));
      setGenerating(null);
    }
  }

  return (
    <div className="space-y-14">
      <section className="pt-4 sm:pt-10">
        <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
          ✦ AI-powered course generator
        </p>
        <h1 className="font-display text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
          What do you want to learn today?
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">
          Type any topic and Edify builds a complete course for you: modules, lessons, code
          examples, videos and quizzes.
        </p>

        <div className="mt-8 space-y-4">
          {error && <ErrorMessage title="Couldn't generate the course" message={error} />}
          {generating ? (
            <GeneratingCourse topic={generating} />
          ) : (
            <PromptForm onSubmit={handleGenerate} disabled={Boolean(generating)} />
          )}
        </div>
      </section>

      <section aria-labelledby="recent-heading">
        <h2 id="recent-heading" className="mb-4 text-lg font-semibold">
          Your courses
        </h2>
        {status === 'loading' && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-40 rounded-2xl" />
            ))}
          </div>
        )}
        {status === 'error' && (
          <ErrorMessage
            title="Your courses couldn't be loaded"
            message="The server may be waking up. Try again in a moment."
            onRetry={refresh}
          />
        )}
        {status === 'ready' && courses.length === 0 && (
          <p className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-muted">
            No courses yet. Generate your first one above!
          </p>
        )}
        {status === 'ready' && courses.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <CourseCard key={course._id} course={course} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
