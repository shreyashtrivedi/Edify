import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Search,
  Sparkles,
  Target,
} from 'lucide-react';
import { useEffect } from 'react';
import { Link, useOutletContext, useParams } from 'react-router';
import CourseOutline from '../components/course/CourseOutline';
import DownloadPdfButton from '../components/DownloadPdfButton';
import LessonRenderer from '../components/LessonRenderer';
import NarrationPlayer from '../components/NarrationPlayer';
import ErrorMessage from '../components/ui/ErrorMessage';
import { LessonSkeleton } from '../components/ui/Skeleton';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useLesson } from '../hooks/useLesson';
import { coursePath, flattenLessons, lessonPath, webSearchUrl } from '../utils/paths';

export default function LessonPage() {
  const { course, markLessonEnriched } = useOutletContext();
  const params = useParams();
  const moduleIndex = Number(params.moduleIndex) - 1; // URLs are 1-based
  const lessonIndex = Number(params.lessonIndex) - 1;

  const module = course.modules[moduleIndex];
  const outlineLesson = module?.lessons[lessonIndex];

  const { lesson, status, error, retry, regenerate } = useLesson(outlineLesson?._id, {
    onGenerated: markLessonEnriched,
  });
  useDocumentTitle(outlineLesson?.title);

  useEffect(() => window.scrollTo(0, 0), [outlineLesson?._id]);

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
      <article className="min-w-0">
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
              {lesson.objectives?.length > 0 && (
                <section className="mb-8 rounded-2xl border border-line bg-surface p-5">
                  <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-muted uppercase">
                    <Target className="size-4 text-brand" aria-hidden="true" /> What you&apos;ll
                    learn
                  </h2>
                  <ul className="mt-3 space-y-2">
                    {lesson.objectives.map((objective) => (
                      <li key={objective} className="flex gap-2 text-sm leading-6">
                        <span className="text-brand" aria-hidden="true">
                          ✓
                        </span>{' '}
                        {objective}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* key: regenerated content gets a fresh player (its old narration was deleted) */}
              <NarrationPlayer
                key={`narration-${lesson.updatedAt}`}
                lessonId={lesson._id}
                initialNarration={lesson.narration}
              />

              {/* key forces a fresh renderer (and quiz score) when the content is regenerated */}
              <LessonRenderer key={lesson.updatedAt} content={lesson.content} />

              {lesson.keyTopics?.length > 0 && (
                <section className="mt-12">
                  <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">
                    Key topics
                  </h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {lesson.keyTopics.map((topic) => (
                      <span
                        key={topic}
                        className="rounded-full bg-brand-soft px-3 py-1 text-sm text-brand"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {lesson.resources?.length > 0 && (
                <section className="mt-10">
                  <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">
                    Suggested readings
                  </h2>
                  <ul className="mt-3 space-y-2">
                    {lesson.resources.map((resource) => (
                      <li key={resource.title}>
                        <a
                          href={resource.url || webSearchUrl(resource.searchQuery)}
                          target="_blank"
                          rel="noreferrer"
                          className="group flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm hover:border-brand/40"
                        >
                          {resource.url ? (
                            <ExternalLink
                              className="size-4 shrink-0 text-muted"
                              aria-hidden="true"
                            />
                          ) : (
                            <Search className="size-4 shrink-0 text-muted" aria-hidden="true" />
                          )}
                          <span className="flex-1 group-hover:text-brand">{resource.title}</span>
                          <span className="text-xs text-muted capitalize">{resource.type}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>

        <nav
          className="mt-14 grid gap-3 border-t border-line pt-6 sm:grid-cols-2"
          aria-label="Lesson navigation"
        >
          {previous ? (
            <Link
              to={lessonPath(course._id, previous.moduleIndex, previous.lessonIndex)}
              className="group rounded-xl border border-line p-4 hover:border-brand/40"
            >
              <span className="flex items-center gap-1 text-xs text-muted">
                <ArrowLeft className="size-3.5" /> Previous
              </span>
              <span className="mt-1 block text-sm font-medium group-hover:text-brand">
                {previous.lesson.title}
              </span>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link
              to={lessonPath(course._id, next.moduleIndex, next.lessonIndex)}
              className="group rounded-xl border border-line p-4 text-right hover:border-brand/40"
            >
              <span className="flex items-center justify-end gap-1 text-xs text-muted">
                Next <ArrowRight className="size-3.5" />
              </span>
              <span className="mt-1 block text-sm font-medium group-hover:text-brand">
                {next.lesson.title}
              </span>
            </Link>
          )}
        </nav>
      </article>

      <aside className="hidden xl:block">
        <div className="sticky top-8 max-h-[calc(100dvh-4rem)] overflow-y-auto pr-1">
          <CourseOutline course={course} />
        </div>
      </aside>
    </div>
  );
}
