import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router';

/**
 * The modules of a course as cards, each listing its lessons.
 * Used on your own course page and on a shared course page:
 * - `lessonHref(moduleIndex, lessonIndex)` builds each lesson's link;
 * - `renderLessonExtras(lesson)` adds badges after the title (quiz score, "not written yet"...).
 */
export default function ModuleList({ course, lessonHref, renderLessonExtras }) {
  return (
    <ol className="mt-8 space-y-5">
      {course.modules.map((module, moduleIndex) => (
        <li key={module._id} className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
          <div className="flex gap-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft font-display font-semibold text-brand">
              {moduleIndex + 1}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold">{module.title}</h2>
              {module.description && (
                <p className="mt-1 text-sm text-muted">{module.description}</p>
              )}

              <ul className="mt-4 divide-y divide-line">
                {module.lessons.map((lesson, lessonIndex) => (
                  <li key={lesson._id}>
                    <Link
                      to={lessonHref(moduleIndex, lessonIndex)}
                      className="group flex items-center gap-3 py-2.5 text-sm"
                    >
                      <span className="w-8 shrink-0 font-mono text-xs text-muted">
                        {moduleIndex + 1}.{lessonIndex + 1}
                      </span>
                      <span className="flex-1 group-hover:text-brand">{lesson.title}</span>
                      {renderLessonExtras?.(lesson)}
                      <ArrowRight className="size-4 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
