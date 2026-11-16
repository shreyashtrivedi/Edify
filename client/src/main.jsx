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
import { ThemeProvider } from './context/ThemeProvider';
import HomePage from './pages/HomePage';
import {
  CourseLayout,
  CoursePage,
  LessonPage,
  SharedCourseLayout,
  SharedCoursePage,
  SharedLessonPage,
} from './pages/lazyPages';
import NotFoundPage from './pages/NotFoundPage';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
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
                    <Route
                      path="module/:moduleIndex/lesson/:lessonIndex"
                      element={<LessonPage />}
                    />
                  </Route>
                </Route>

                {/* Share links are public: anyone with the link can read, no login needed */}
                <Route path="share/:token" element={<SharedCourseLayout />}>
                  <Route index element={<SharedCoursePage />} />
                  <Route
                    path="module/:moduleIndex/lesson/:lessonIndex"
                    element={<SharedLessonPage />}
                  />
                </Route>

                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </CoursesProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
);
