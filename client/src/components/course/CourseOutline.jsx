import { Circle, CircleCheck, CircleDot } from 'lucide-react';
import { NavLink } from 'react-router';
import { lessonPath } from '../../utils/paths';

/**
 * Compact table of contents shown beside a lesson. The current lesson is highlighted.
 * Icons: green check = completed, dot = opened (content generated), empty circle = not opened.
 */
function LessonStatusIcon({ lesson }) {
  if (lesson.progress?.completed) {
    return (
      <>
        <CircleCheck className="mt-0.5 size-3.5 shrink-0 text-emerald-500" aria-hidden="true" />
        <span className="sr-only">(completed)</span>
      </>
    );
  }
  if (lesson.isEnriched) {
    return (
      <>
        <CircleDot className="mt-0.5 size-3.5 shrink-0 text-brand/70" aria-hidden="true" />
        <span className="sr-only">(opened)</span>
      </>
    );
  }
  return <Circle className="mt-0.5 size-3.5 shrink-0 opacity-40" aria-hidden="true" />;
}

export default function CourseOutline({ course }) {
  return (
    <nav aria-label="Course outline" className="space-y-5">
      {course.modules.map((module, moduleIndex) => (
        <div key={module._id}>
          <p className="mb-1.5 text-xs font-semibold tracking-wide text-muted uppercase">
            {moduleIndex + 1}. {module.title}
          </p>
          <ul className="space-y-0.5">
            {module.lessons.map((lesson, lessonIndex) => (
              <li key={lesson._id}>
                <NavLink
                  to={lessonPath(course._id, moduleIndex, lessonIndex)}
                  className={({ isActive }) =>
                    `flex items-start gap-2 rounded-md px-2 py-1.5 text-sm leading-snug transition-colors ${
                      isActive
                        ? 'bg-brand-soft font-medium text-brand'
                        : 'text-muted hover:bg-subtle hover:text-ink'
                    }`
                  }
                >
                  <LessonStatusIcon lesson={lesson} />
                  {lesson.title}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
