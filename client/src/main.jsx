import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';

import '@fontsource-variable/inter';
import '@fontsource-variable/fraunces';
import '@fontsource-variable/jetbrains-mono';
import './index.css';

import App from './App';
import { CoursesProvider } from './context/CoursesProvider';
import CourseLayout from './pages/CourseLayout';
import CoursePage from './pages/CoursePage';
import HomePage from './pages/HomePage';
import LessonPage from './pages/LessonPage';
import NotFoundPage from './pages/NotFoundPage';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CoursesProvider>
      <BrowserRouter>
        <Routes>
          {/* App is the layout (sidebar + <Outlet />); child routes render inside it */}
          <Route path="/" element={<App />}>
            <Route index element={<HomePage />} />

            {/* CourseLayout loads the course once for the overview and all its lessons */}
            <Route path="courses/:courseId" element={<CourseLayout />}>
              <Route index element={<CoursePage />} />
              <Route path="module/:moduleIndex/lesson/:lessonIndex" element={<LessonPage />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </CoursesProvider>
  </StrictMode>,
);
