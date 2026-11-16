import { ArrowRight, BookOpen, FileText, Layers } from 'lucide-react';
import { useEffect } from 'react';
import { Link, useOutletContext } from 'react-router';
import CourseHeading from '../components/course/CourseHeading';
import ModuleList from '../components/course/ModuleList';
import DownloadPdfButton from '../components/DownloadPdfButton';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { sharedApi } from '../utils/api';
import { flattenLessons, sharedLessonPath } from '../utils/paths';
import { preload } from './lazyPages';

/** Overview of a shared course: outline, "Start reading" and the course PDF. Read-only. */
export default function SharedCoursePage() {
  const { course, token } = useOutletContext();
  useDocumentTitle(course.title);
  useEffect(() => {
    preload.sharedLesson(); // the likely next page: download it in the background
  }, []);

  const lessons = flattenLessons(course);
  const writtenCount = lessons.filter(({ lesson }) => lesson.isEnriched).length;
  const first = lessons.find(({ lesson }) => lesson.isEnriched) ?? lessons[0];
  const lessonHref = (moduleIndex, lessonIndex) =>
    sharedLessonPath(token, moduleIndex, lessonIndex);

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
            <FileText className="size-4" aria-hidden="true" /> {writtenCount} written so far
          </span>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {first && (
            <Link
              to={lessonHref(first.moduleIndex, first.lessonIndex)}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-on-brand shadow-sm hover:bg-brand-strong"
            >
              Start reading <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          )}
          <DownloadPdfButton
            label="Course PDF"
            size="md"
            disabled={writtenCount === 0}
            title={
              writtenCount === 0
                ? 'No lesson has been written yet'
                : 'Download every written lesson as one PDF'
            }
            onDownload={async () => {
              const [{ downloadCoursePdf }, fullCourse] = await Promise.all([
                import('../pdf/index.jsx'),
                sharedApi.export(token),
              ]);
              await downloadCoursePdf(fullCourse);
            }}
          />
        </div>
      </header>

      <ModuleList
        course={course}
        lessonHref={lessonHref}
        renderLessonExtras={(lesson) =>
          !lesson.isEnriched && (
            <span className="rounded-full bg-subtle px-2 py-0.5 text-xs text-muted">
              Not written yet
            </span>
          )
        }
      />
    </article>
  );
}
