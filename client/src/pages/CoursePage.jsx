import { ArrowRight, BookOpen, CircleCheck, Layers, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router';
import LevelBadge from '../components/course/LevelBadge';
import { useCourses } from '../hooks/useCourses';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { coursesApi, getErrorMessage } from '../utils/api';
import { flattenLessons, lessonPath } from '../utils/paths';

export default function CoursePage() {
  const { course } = useOutletContext();
  const { removeCourse } = useCourses();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  useDocumentTitle(course.title);

  const lessons = flattenLessons(course);
  const readyCount = lessons.filter(({ lesson }) => lesson.isEnriched).length;
  // "Continue" jumps to the first lesson not opened yet (or the first lesson)
  const next = lessons.find(({ lesson }) => !lesson.isEnriched) ?? lessons[0];

  async function handleDelete() {
    if (!window.confirm(`Delete "${course.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await coursesApi.remove(course._id);
      removeCourse(course._id);
      navigate('/');
    } catch (err) {
      window.alert(getErrorMessage(err));
      setDeleting(false);
    }
  }

  return (
    <article>
      <header className="border-b border-line pb-8">
        <div className="flex flex-wrap items-center gap-2">
          <LevelBadge level={course.level} />
          {course.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-subtle px-2.5 py-0.5 text-xs text-muted">
              #{tag}
            </span>
          ))}
        </div>
        <h1 className="mt-4 font-display text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
          {course.title}
        </h1>
        <p className="mt-3 max-w-3xl text-lg text-muted">{course.description}</p>

        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Layers className="size-4" aria-hidden="true" /> {course.modules.length} modules
          </span>
          <span className="inline-flex items-center gap-1.5">
            <BookOpen className="size-4" aria-hidden="true" /> {lessons.length} lessons
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CircleCheck className="size-4" aria-hidden="true" /> {readyCount} opened
          </span>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {next && (
            <Link
              to={lessonPath(course._id, next.moduleIndex, next.lessonIndex)}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-on-brand shadow-sm hover:bg-brand-strong"
            >
              {readyCount === 0 ? 'Start learning' : 'Continue'} <ArrowRight className="size-4" />
            </Link>
          )}
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-muted hover:border-red-300 hover:text-red-600 disabled:opacity-50"
          >
            <Trash2 className="size-4" aria-hidden="true" /> {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </header>

      <ol className="mt-8 space-y-5">
        {course.modules.map((module, moduleIndex) => (
          <li key={module._id} className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
            <div className="flex gap-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft font-display font-semibold text-brand">
                {moduleIndex + 1}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold">{module.title}</h2>
                {module.description && <p className="mt-1 text-sm text-muted">{module.description}</p>}

                <ul className="mt-4 divide-y divide-line">
                  {module.lessons.map((lesson, lessonIndex) => (
                    <li key={lesson._id}>
                      <Link
                        to={lessonPath(course._id, moduleIndex, lessonIndex)}
                        className="group flex items-center gap-3 py-2.5 text-sm"
                      >
                        <span className="w-8 shrink-0 font-mono text-xs text-muted">
                          {moduleIndex + 1}.{lessonIndex + 1}
                        </span>
                        <span className="flex-1 group-hover:text-brand">{lesson.title}</span>
                        {lesson.isEnriched && (
                          <>
                            <CircleCheck className="size-4 text-emerald-500" aria-hidden="true" />
                            <span className="sr-only">(opened)</span>
                          </>
                        )}
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
    </article>
  );
}
