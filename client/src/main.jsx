import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';

import '@fontsource-variable/inter';
import '@fontsource-variable/fraunces';
import '@fontsource-variable/jetbrains-mono';
import './index.css';

import App from './App';
import { AuthProvider } from './auth/AuthProvider';
import RequireAuth from './auth/RequireAuth';
import { CoursesProvider } from './context/CoursesProvider';
import CourseLayout from './pages/CourseLayout';
import CoursePage from './pages/CoursePage';
import HomePage from './pages/HomePage';
import LessonPage from './pages/LessonPage';
import NotFoundPage from './pages/NotFoundPage';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* AuthProvider sits inside the router so it can navigate back after login */}
    <BrowserRouter>
      <AuthProvider>
        <CoursesProvider>
          <Routes>
            {/* App is the layout (sidebar + <Outlet />); child routes render inside it */}
            <Route path="/" element={<App />}>
              <Route index element={<HomePage />} />

              {/* Everything inside RequireAuth needs a login */}
              <Route element={<RequireAuth />}>
                {/* CourseLayout loads the course once for the overview and all its lessons */}
                <Route path="courses/:courseId" element={<CourseLayout />}>
                  <Route index element={<CoursePage />} />
                  <Route path="module/:moduleIndex/lesson/:lessonIndex" element={<LessonPage />} />
                </Route>
              </Route>

              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </CoursesProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
