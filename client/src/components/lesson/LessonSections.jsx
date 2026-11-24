import { ArrowLeft, ArrowRight, ExternalLink, Search, Target } from 'lucide-react';
import { Link } from 'react-router';
import { stripInline } from '../../utils/inlineFormat';
import { webSearchUrl } from '../../utils/paths';
import InlineText from '../blocks/InlineText';

/**
 * Parts of a lesson page shared by your own lessons (LessonPage) and shared ones
 * (SharedLessonPage). Each renders nothing when it has nothing to show.
 */

/** "What you'll learn" box. */
export function LessonObjectives({ objectives = [] }) {
  if (objectives.length === 0) return null;
  return (
    <section className="mb-8 rounded-2xl border border-line bg-surface p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-muted uppercase">
        <Target className="size-4 text-brand" aria-hidden="true" /> What you&apos;ll learn
      </h2>
      <ul className="mt-3 space-y-2">
        {objectives.map((objective) => (
          <li key={objective} className="flex gap-2 text-sm leading-6">
            <span className="text-brand" aria-hidden="true">
              ✓
            </span>{' '}
            {/* The AI sometimes bolds key terms here, like in paragraphs. One wrapping span
                keeps the formatted pieces together as a single item of the flex row. */}
            <span>
              <InlineText text={objective} />
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function LessonKeyTopics({ topics = [] }) {
  if (topics.length === 0) return null;
  return (
    <section className="mt-12">
      <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">Key topics</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {topics.map((topic) => (
          <span key={topic} className="rounded-full bg-brand-soft px-3 py-1 text-sm text-brand">
            {stripInline(topic)}
          </span>
        ))}
      </div>
    </section>
  );
}

export function LessonReadings({ resources = [] }) {
  if (resources.length === 0) return null;
  return (
    <section className="mt-10">
      <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">
        Suggested readings
      </h2>
      <ul className="mt-3 space-y-2">
        {resources.map((resource) => (
          <li key={resource.title}>
            <a
              href={resource.url || webSearchUrl(resource.searchQuery)}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm hover:border-brand/40"
            >
              {resource.url ? (
                <ExternalLink className="size-4 shrink-0 text-muted" aria-hidden="true" />
              ) : (
                <Search className="size-4 shrink-0 text-muted" aria-hidden="true" />
              )}
              <span className="flex-1 group-hover:text-brand">{stripInline(resource.title)}</span>
              <span className="text-xs text-muted capitalize">{resource.type}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Previous / next lesson links (across module boundaries).
 * `previous` / `next` are entries from flattenLessons(); `lessonHref(moduleIndex, lessonIndex)`
 * builds the URL, so the same component works for own and shared lessons.
 */
export function LessonNavigation({ previous, next, lessonHref }) {
  return (
    <nav
      className="mt-14 grid gap-3 border-t border-line pt-6 sm:grid-cols-2"
      aria-label="Lesson navigation"
    >
      {previous ? (
        <Link
          to={lessonHref(previous.moduleIndex, previous.lessonIndex)}
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
          to={lessonHref(next.moduleIndex, next.lessonIndex)}
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
  );
}
