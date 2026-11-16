import { RefreshCw, Sparkles } from 'lucide-react';
import { useEffect } from 'react';
import { Link, useOutletContext, useParams } from 'react-router';
import CourseOutline from '../components/course/CourseOutline';
import DownloadPdfButton from '../components/DownloadPdfButton';
import LessonCompletion from '../components/LessonCompletion';
import {
  LessonKeyTopics,
  LessonNavigation,
  LessonObjectives,
  LessonReadings,
} from '../components/lesson/LessonSections';
import LessonRenderer from '../components/LessonRenderer';
import NarrationPlayer from '../components/NarrationPlayer';
import LessonTutor from '../components/tutor/LessonTutor';
import ErrorMessage from '../components/ui/ErrorMessage';
import { LessonSkeleton } from '../components/ui/Skeleton';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useCourses } from '../hooks/useCourses';
import { useLesson } from '../hooks/useLesson';
import { useLessonProgress } from '../hooks/useLessonProgress';
import { coursePath, flattenLessons, lessonPath } from '../utils/paths';

export default function LessonPage() {
  const { course, markLessonEnriched, updateLessonProgress } = useOutletContext();
  const { refresh: refreshCourseList } = useCourses();
  const params = useParams();
  const moduleIndex = Number(params.moduleIndex) - 1; // URLs are 1-based
  const lessonIndex = Number(params.lessonIndex) - 1;

  const module = course.modules[moduleIndex];
  const outlineLesson = module?.lessons[lessonIndex];

  const { lesson, status, error, retry, regenerate } = useLesson(outlineLesson?._id, {
    onGenerated: markLessonEnriched,
  });
  useDocumentTitle(outlineLesson?.title);

  const {
    progress,
    saving,
    error: progressError,
    save: saveProgress,
  } = useLessonProgress(lesson, {
    onSaved: (saved) => {
      const wasCompleted = Boolean(outlineLesson?.progress?.completed);
      updateLessonProgress(outlineLesson._id, saved); // outline + course page update instantly
      if (saved.completed !== wasCompleted) refreshCourseList(); // course cards show completed counts
    },
  });

  // Braces matter: an effect may only return a cleanup function, and in current Chrome
  // window.scrollTo() returns a Promise, which React would try to call (and crash) on cleanup.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [outlineLesson?._id]);

  if (!outlineLesson) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-semibold">Lesson not found</h1>
        <Link to={coursePath(course._id)} className="mt-4 inline-block text-brand hover:underline">
          Back to the course
        </Link>
      </div>
    );
  }

  // Previous / next lesson across module boundaries
  const all = flattenLessons(course);
  const position = all.findIndex((entry) => entry.lesson._id === outlineLesson._id);
  const previous = all[position - 1];
  const next = all[position + 1];
  const isReady = status === 'ready' && lesson;

  return (
    <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_15rem]">
      {/* pb-16: room for the floating "Ask a doubt" button below the lesson navigation */}
      <article className="min-w-0 pb-16">
        <nav
          className="flex flex-wrap items-center gap-1.5 text-sm text-muted"
          aria-label="Breadcrumb"
        >
          <Link to={coursePath(course._id)} className="hover:text-brand hover:underline">
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
          {isReady && (
            <div className="flex flex-wrap items-start gap-2">
              <DownloadPdfButton
                onDownload={async () => {
                  // Load the PDF code only now, on demand (it is a separate ~500 kB chunk)
                  const { downloadLessonPdf } = await import('../pdf/index.jsx');
                  await downloadLessonPdf({ course, moduleIndex, lessonIndex, lesson });
                }}
              />
              <button
                type="button"
                onClick={regenerate}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm text-muted hover:border-brand hover:text-brand"
                title="Ask the AI to write this lesson again"
              >
                <RefreshCw className="size-4" aria-hidden="true" /> Regenerate
              </button>
            </div>
          )}
        </div>
        <p className="mt-2 text-sm text-muted">
          Lesson {lessonIndex + 1} of {module.lessons.length}
        </p>

        <div className="mt-8">
          {(status === 'loading' || status === 'generating') && (
            <div className="space-y-6">
              {status === 'generating' && (
                <div className="flex items-center gap-3 rounded-xl border border-brand/25 bg-brand-soft p-4 text-sm text-brand">
                  <Sparkles className="size-5 shrink-0 animate-pulse" aria-hidden="true" />
                  <span>
                    <strong>Writing this lesson for you…</strong> This takes a few seconds the first
                    time. After that it loads instantly.
                  </span>
                </div>
              )}
              <LessonSkeleton />
            </div>
          )}

          {status === 'error' && (
            <ErrorMessage title="Couldn't load this lesson" message={error} onRetry={retry} />
          )}

          {isReady && (
            <>
              <LessonObjectives objectives={lesson.objectives} />

              {/* key: regenerated content gets a fresh player (its old narration was deleted) */}
              <NarrationPlayer
                key={`narration-${lesson.updatedAt}`}
                lessonId={lesson._id}
                initialNarration={lesson.narration}
              />

              {/* key forces a fresh renderer (and quiz score) when the content is regenerated */}
              <LessonRenderer
                key={lesson.updatedAt}
                content={lesson.content}
                initialAnswers={lesson.progress?.quizAnswers}
                onAnswersChange={(quizAnswers) => saveProgress({ quizAnswers })}
              />

              <LessonKeyTopics topics={lesson.keyTopics} />
              <LessonReadings resources={lesson.resources} />

              <LessonCompletion
                progress={progress}
                saving={saving}
                error={progressError}
                onToggle={(completed) => saveProgress({ completed })}
              />
            </>
          )}
        </div>

        <LessonNavigation
          previous={previous}
          next={next}
          lessonHref={(m, l) => lessonPath(course._id, m, l)}
        />
      </article>

      <aside className="hidden xl:block">
        {/* max-h leaves the bottom of the screen free for the "Ask a doubt" button */}
        <div className="sticky top-8 max-h-[calc(100dvh-9rem)] overflow-y-auto pr-1">
          <CourseOutline course={course} />
        </div>
      </aside>

      {/* key: each lesson gets its own chat (switching lessons stops a running answer) */}
      {isReady && (
        <LessonTutor key={lesson._id} lessonId={lesson._id} lessonTitle={outlineLesson.title} />
      )}
    </div>
  );
}
