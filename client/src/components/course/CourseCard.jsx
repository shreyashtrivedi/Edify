import { BookOpen, Layers } from 'lucide-react';
import { Link } from 'react-router';
import { coursePath } from '../../utils/paths';
import LevelBadge from './LevelBadge';

export default function CourseCard({ course }) {
  const completed = course.completedCount ?? 0;
  const progress = course.lessonCount ? Math.round((completed / course.lessonCount) * 100) : 0;

  return (
    <Link
      to={coursePath(course._id)}
      className="group flex flex-col rounded-2xl border border-line bg-surface p-5 transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="line-clamp-2 font-semibold leading-snug group-hover:text-brand">
          {course.title}
        </h3>
        <LevelBadge level={course.level} />
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-muted">{course.description}</p>

      <div className="mt-auto flex items-center gap-4 pt-4 text-xs text-muted">
        <span className="inline-flex items-center gap-1">
          <Layers className="size-3.5" aria-hidden="true" /> {course.moduleCount} modules
        </span>
        <span className="inline-flex items-center gap-1">
          <BookOpen className="size-3.5" aria-hidden="true" /> {course.lessonCount} lessons
        </span>
      </div>
      <div
        className="mt-3 h-1 overflow-hidden rounded-full bg-subtle"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${completed} of ${course.lessonCount} lessons completed`}
        title={`${completed} of ${course.lessonCount} lessons completed`}
      >
        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${progress}%` }} />
      </div>
    </Link>
  );
}
