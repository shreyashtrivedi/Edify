/**
 * PDF export entry point.
 *
 * This module (and the ~500 kB PDF library behind it) is loaded with a dynamic
 * import() only when the user clicks "Download PDF", so it never slows down normal page loads.
 *
 * Everything runs in the browser: the lesson data is already on the page, so the server
 * doesn't spend CPU or memory rendering PDFs.
 */
import { Font, pdf } from '@react-pdf/renderer';
import { slugify } from '../utils/format';
import { CourseDocument, LessonDocument } from './documents';

// The default hyphenation splits English words oddly ("compo-nent"); wrap whole words instead.
Font.registerHyphenationCallback((word) => [word]);

/** Renders a PDF document to a Blob and makes the browser download it. */
async function download(document, filename) {
  const blob = await pdf(document).toBlob();
  const url = URL.createObjectURL(blob);
  const link = Object.assign(window.document.createElement('a'), { href: url, download: filename });
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000); // free the memory once the download started
}

export function downloadLessonPdf({ course, moduleIndex, lessonIndex, lesson }) {
  return download(
    <LessonDocument course={course} moduleIndex={moduleIndex} lessonIndex={lessonIndex} lesson={lesson} />,
    `${slugify(lesson.title)}.pdf`,
  );
}

/** `course` must include lesson content: use coursesApi.export(). */
export function downloadCoursePdf(course) {
  return download(<CourseDocument course={course} exportedAt={new Date()} />, `${slugify(course.title)}.pdf`);
}
