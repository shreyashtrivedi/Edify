/**
 * URL builders, so route shapes live in one place.
 * Module/lesson numbers in URLs are 1-based for readability: /module/1/lesson/1.
 */
export const coursePath = (courseId) => `/courses/${courseId}`;

export const lessonPath = (courseId, moduleIndex, lessonIndex) =>
  `/courses/${courseId}/module/${moduleIndex + 1}/lesson/${lessonIndex + 1}`;

/** Share links: /share/<token> (outline) and /share/<token>/module/1/lesson/1 */
export const sharePath = (token) => `/share/${token}`;

export const sharedLessonPath = (token, moduleIndex, lessonIndex) =>
  `/share/${token}/module/${moduleIndex + 1}/lesson/${lessonIndex + 1}`;

/** The full link to give to other people. */
export const shareUrl = (token) => `${window.location.origin}${sharePath(token)}`;

/** Flattens a course into an ordered list of { lesson, moduleIndex, lessonIndex } for prev/next. */
export function flattenLessons(course) {
  return course.modules.flatMap((module, moduleIndex) =>
    module.lessons.map((lesson, lessonIndex) => ({ lesson, module, moduleIndex, lessonIndex })),
  );
}

export const youtubeSearchUrl = (query) =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

export const webSearchUrl = (query) =>
  `https://www.google.com/search?q=${encodeURIComponent(query)}`;
