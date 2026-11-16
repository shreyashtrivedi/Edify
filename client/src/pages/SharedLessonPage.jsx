import { FileClock } from 'lucide-react';
import { useEffect } from 'react';
import { Link, useOutletContext, useParams } from 'react-router';
import CourseOutline from '../components/course/CourseOutline';
import DownloadPdfButton from '../components/DownloadPdfButton';
import {
  LessonKeyTopics,
  LessonNavigation,
  LessonObjectives,
  LessonReadings,
} from '../components/lesson/LessonSections';
import LessonRenderer from '../components/LessonRenderer';
import ErrorMessage from '../components/ui/ErrorMessage';
import { LessonSkeleton } from '../components/ui/Skeleton';
import { useAsyncData } from '../hooks/useAsyncData';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { sharedApi } from '../utils/api';
import { flattenLessons, sharePath, sharedLessonPath } from '../utils/paths';

function NotWrittenYet() {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-surface p-8 text-center">
      <FileClock className="mx-auto size-8 text-muted" aria-hidden="true" />
      <h2 className="mt-3 font-semibold">This lesson hasn&apos;t been written yet</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted">
        Edify writes each lesson with AI the first time its owner opens it, and this one hasn&apos;t
        been opened yet. Save a copy of the course to have it written for you.
      </p>
    </div>
  );
}

/** One lesson of a shared course. Read-only: quiz answers work but aren't saved. */
export default function SharedLessonPage() {
  const { course, token } = useOutletContext();
  const params = useParams();
  const moduleIndex = Number(params.moduleIndex) - 1; // URLs are 1-based
  const lessonIndex = Number(params.lessonIndex) - 1;
  const module = course.modules[moduleIndex];
  const outlineLesson = module?.lessons[lessonIndex];

  const {
    data: lesson,
    status,
    error,
    reload,
  } = useAsyncData(`share:${token}:${outlineLesson?._id}`, (signal) =>
    outlineLesson ? sharedApi.lesson(token, outlineLesson._id, { signal }) : Promise.resolve(null),
  );
  useDocumentTitle(outlineLesson?.title);
  // Braces matter: an effect may only return a cleanup function, and in current Chrome
  // window.scrollTo() returns a Promise, which React would try to call (and crash) on cleanup.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [outlineLesson?._id]);

  if (!outlineLesson) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-semibold">Lesson not found</h1>
        <Link to={sharePath(token)} className="mt-4 inline-block text-brand hover:underline">
          Back to the course
        </Link>
      </div>
    );
  }

  const all = flattenLessons(course);
  const position = all.findIndex((entry) => entry.lesson._id === outlineLesson._id);
  const lessonHref = (m, l) => sharedLessonPath(token, m, l);
  const isWritten = status === 'ready' && lesson?.isEnriched;

  return (
    <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_15rem]">
      <article className="min-w-0">
        <nav
          className="flex flex-wrap items-center gap-1.5 text-sm text-muted"
          aria-label="Breadcrumb"
        >
          <Link to={sharePath(token)} className="hover:text-brand hover:underline">
            {course.title}
          </Link>
          <span aria-hidden="true">/</span>
          <span>
            Module {moduleIndex + 1}: {module.title}
          </span>
        </nav>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <h1 className="font-display text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
            {outlineLesson.title}
          </h1>
          {isWritten && (
            <DownloadPdfButton
              onDownload={async () => {
                const { downloadLessonPdf } = await import('../pdf/index.jsx');
                await downloadLessonPdf({ course, moduleIndex, lessonIndex, lesson });
              }}
            />
          )}
        </div>
        <p className="mt-2 text-sm text-muted">
          Lesson {lessonIndex + 1} of {module.lessons.length}
        </p>

        <div className="mt-8">
          {status === 'loading' && <LessonSkeleton />}
          {status === 'error' && (
            <ErrorMessage title="Couldn't load this lesson" message={error} onRetry={reload} />
          )}
          {status === 'ready' && !lesson.isEnriched && <NotWrittenYet />}
          {isWritten && (
            <>
              <LessonObjectives objectives={lesson.objectives} />
              <LessonRenderer key={lesson._id} content={lesson.content} />
              <LessonKeyTopics topics={lesson.keyTopics} />
              <LessonReadings resources={lesson.resources} />
            </>
          )}
        </div>

        <LessonNavigation
          previous={all[position - 1]}
          next={all[position + 1]}
          lessonHref={lessonHref}
        />
      </article>

      <aside className="hidden xl:block">
        <div className="sticky top-8 max-h-[calc(100dvh-4rem)] overflow-y-auto pr-1">
          <CourseOutline course={course} lessonHref={lessonHref} />
        </div>
      </aside>
    </div>
  );
}
