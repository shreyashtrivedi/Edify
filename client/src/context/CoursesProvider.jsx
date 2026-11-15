/**
 * Global state for the user's course list (shown in the sidebar and on the home page).
 * Loaded once on startup; updated locally after create/delete so the UI is instant.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { coursesApi, getErrorMessage } from '../utils/api';
import { CoursesContext } from './coursesContext';

/** Builds the list-item shape from a full course returned by the generate endpoint. */
function toSummary(course) {
  return {
    _id: course._id,
    title: course.title,
    description: course.description,
    tags: course.tags,
    level: course.level,
    createdAt: course.createdAt,
    moduleCount: course.modules.length,
    lessonCount: course.modules.reduce((total, module) => total + module.lessons.length, 0),
    enrichedCount: 0,
  };
}

export function CoursesProvider({ children }) {
  const [courses, setCourses] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState(null);

  const refresh = useCallback(
    () =>
      coursesApi
        .list()
        .then((list) => {
          setCourses(list);
          setStatus('ready');
          setError(null);
        })
        .catch((err) => {
          setError(getErrorMessage(err));
          setStatus('error');
        }),
    [],
  );

  // Initial load (status already starts as 'loading')
  useEffect(() => {
    refresh();
  }, [refresh]);

  const addCourse = useCallback((course) => {
    setCourses((current) => [toSummary(course), ...current]);
  }, []);

  const removeCourse = useCallback((courseId) => {
    setCourses((current) => current.filter((course) => course._id !== courseId));
  }, []);

  const value = useMemo(
    () => ({ courses, status, error, refresh, addCourse, removeCourse }),
    [courses, status, error, refresh, addCourse, removeCourse],
  );

  return <CoursesContext.Provider value={value}>{children}</CoursesContext.Provider>;
}
