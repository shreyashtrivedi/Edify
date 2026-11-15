import { useContext } from 'react';
import { CoursesContext } from '../context/coursesContext';

/** Access the global course list: { courses, status, error, refresh, addCourse, removeCourse } */
export function useCourses() {
  const context = useContext(CoursesContext);
  if (!context) throw new Error('useCourses must be used inside <CoursesProvider>');
  return context;
}
