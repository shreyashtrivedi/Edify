import { lazy } from 'react';

/**
 * Pages loaded on demand (code-splitting).
 *
 * The home page is all a first-time visitor needs, so only it ships in the main bundle.
 * Course, lesson and shared pages (with the code highlighter, the tutor, the quiz...) become
 * separate files that the browser downloads the first time they are opened. A <Suspense>
 * boundary shows a spinner in the meantime (see App.jsx).
 *
 * `preload` starts downloading the page a user is likely to open next, while they are still
 * on the current one, so moving there feels instant. import() is cached, so this is cheap.
 */
const loaders = {
  CourseLayout: () => import('./CourseLayout'),
  CoursePage: () => import('./CoursePage'),
  LessonPage: () => import('./LessonPage'),
  SharedCourseLayout: () => import('./SharedCourseLayout'),
  SharedCoursePage: () => import('./SharedCoursePage'),
  SharedLessonPage: () => import('./SharedLessonPage'),
};

export const CourseLayout = lazy(loaders.CourseLayout);
export const CoursePage = lazy(loaders.CoursePage);
export const LessonPage = lazy(loaders.LessonPage);
export const SharedCourseLayout = lazy(loaders.SharedCourseLayout);
export const SharedCoursePage = lazy(loaders.SharedCoursePage);
export const SharedLessonPage = lazy(loaders.SharedLessonPage);

export const preload = {
  /** From the home page, the next stop is a course. */
  course: () => Promise.all([loaders.CourseLayout(), loaders.CoursePage()]),
  /** From a course page, the next stop is a lesson. */
  lesson: () => loaders.LessonPage(),
  sharedLesson: () => loaders.SharedLessonPage(),
};
