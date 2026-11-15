import { createContext } from 'react';

/** Holds { courses, status, error, refresh, addCourse, removeCourse }. See CoursesProvider. */
export const CoursesContext = createContext(null);
