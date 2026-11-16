import { ArrowRight, BookOpen, CircleCheck, Layers, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router';
import CourseHeading from '../components/course/CourseHeading';
import ModuleList from '../components/course/ModuleList';
import ShareCourse from '../components/course/ShareCourse';
import DownloadPdfButton from '../components/DownloadPdfButton';
import { useCourses } from '../hooks/useCourses';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { coursesApi, getErrorMessage } from '../utils/api';
import { flattenLessons, lessonPath } from '../utils/paths';
import { preload } from './lazyPages';

/** Quiz score and completion check after a lesson title. */
function LessonProgressBadges({ lesson }) {
  return (
    <>
      {lesson.progress?.quizAnswers?.some((answer) => answer !== null) && (
        <span className="rounded-full bg-subtle px-2 py-0.5 text-xs text-muted" title="Quiz score">
          {lesson.progress.quizScore}/{lesson.progress.quizTotal}
        </span>
      )}
      {lesson.progress?.completed && (
        <>
          <CircleCheck className="size-4 text-emerald-500" aria-hidden="true" />
          <span className="sr-only">(completed)</span>
        </>
      )}
    </>
  );
}

export default function CoursePage() {
  const { course, patchCourse } = useOutletContext();
  const { removeCourse, refresh: refreshCourseList } = useCourses();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  useDocumentTitle(course.title);
  useEffect(() => {
    preload.lesson(); // the likely next page: download it in the background
  }, []);

  const lessons = flattenLessons(course);
  const readyCount = lessons.filter(({ lesson }) => lesson.isEnriched).length;
  const completedCount = lessons.filter(({ lesson }) => lesson.progress?.completed).length;
  const percent = lessons.length ? Math.round((completedCount / lessons.length) * 100) : 0;
  // "Continue" jumps to the first lesson not completed yet (or the first lesson)
  const next = lessons.find(({ lesson }) => !lesson.progress?.completed) ?? lessons[0];

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
        <CourseHeading course={course} />

        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Layers className="size-4" aria-hidden="true" /> {course.modules.length} modules
          </span>
          <span className="inline-flex items-center gap-1.5">
            <BookOpen className="size-4" aria-hidden="true" /> {lessons.length} lessons
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CircleCheck className="size-4" aria-hidden="true" /> {completedCount} completed
          </span>
        </div>

        <div className="mt-5 max-w-md">
          <div className="flex justify-between text-xs font-medium text-muted">
            <span>Your progress</span>
            <span>{percent}%</span>
          </div>
          <div
            className="mt-1.5 h-2 overflow-hidden rounded-full bg-subtle"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${completedCount} of ${lessons.length} lessons completed`}
          >
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {next && (
            <Link
              to={lessonPath(course._id, next.moduleIndex, next.lessonIndex)}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-on-brand shadow-sm hover:bg-brand-strong"
            >
              {completedCount === 0 && readyCount === 0
                ? 'Start learning'
                : completedCount === lessons.length
                  ? 'Review the course'
                  : 'Continue'}{' '}
              <ArrowRight className="size-4" />
            </Link>
          )}
          <DownloadPdfButton
            label="Course PDF"
            size="md"
            disabled={readyCount === 0}
            title={
              readyCount === 0
                ? 'Open a lesson first: lessons are written the first time you open them'
                : 'Download every generated lesson as one PDF'
            }
            onDownload={async () => {
              const [{ downloadCoursePdf }, fullCourse] = await Promise.all([
                import('../pdf/index.jsx'),
                coursesApi.export(course._id),
              ]);
              await downloadCoursePdf(fullCourse);
            }}
          />
          <ShareCourse
            course={course}
            onShareChange={(share) => {
              patchCourse(share); // this page updates instantly
              refreshCourseList(); // course cards show a "Shared" label
            }}
          />
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-muted hover:border-red-300 hover:text-red-600 disabled:opacity-50 dark:hover:border-red-900 dark:hover:text-red-400"
          >
            <Trash2 className="size-4" aria-hidden="true" /> {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </header>

      <ModuleList
        course={course}
        lessonHref={(moduleIndex, lessonIndex) => lessonPath(course._id, moduleIndex, lessonIndex)}
        renderLessonExtras={(lesson) => <LessonProgressBadges lesson={lesson} />}
      />
    </article>
  );
}
