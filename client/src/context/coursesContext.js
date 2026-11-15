import { createContext } from 'react';

/**
 * Holds { courses, status, error, refresh, addCourse, removeCourse }. See CoursesProvider.
 * status: 'loading' | 'ready' | 'error' | 'idle' (logged out)
 */
export const CoursesContext = createContext(null);
