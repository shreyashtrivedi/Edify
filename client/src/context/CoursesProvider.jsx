/**
 * Global state for the user's course list (shown in the sidebar and on the home page).
 * Loaded once the user is logged in; updated locally after create/delete so the UI is instant.
 */
import { useAuth0 } from '@auth0/auth0-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { coursesApi, getErrorMessage } from '../utils/api';
import { CoursesContext } from './coursesContext';

const EMPTY = [];

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
  const { isAuthenticated, isLoading: authLoading } = useAuth0();
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

  // Load as soon as the user is logged in (status already starts as 'loading')
  useEffect(() => {
    if (isAuthenticated) refresh();
  }, [isAuthenticated, refresh]);

  const addCourse = useCallback((course) => {
    setCourses((current) => [toSummary(course), ...current]);
  }, []);

  const removeCourse = useCallback((courseId) => {
    setCourses((current) => current.filter((course) => course._id !== courseId));
  }, []);

  // Logged out: nothing to show ('idle'). While Auth0 is still checking the session: 'loading'.
  const visibleStatus = isAuthenticated ? status : authLoading ? 'loading' : 'idle';
  const visibleCourses = isAuthenticated ? courses : EMPTY;

  const value = useMemo(
    () => ({
      courses: visibleCourses,
      status: visibleStatus,
      error,
      refresh,
      addCourse,
      removeCourse,
    }),
    [visibleCourses, visibleStatus, error, refresh, addCourse, removeCourse],
  );

  return <CoursesContext.Provider value={value}>{children}</CoursesContext.Provider>;
}
