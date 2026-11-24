import { Suspense, useRef, useState } from 'react';
import { Link, Outlet } from 'react-router';
import Logo from './components/Logo';
import ServerWakingNotice from './components/ServerWakingNotice';
import Sidebar from './components/Sidebar';
import LoadingSpinner from './components/ui/LoadingSpinner';

/**
 * Root layout: persistent sidebar + main content area.
 * Child routes (Home, Course, Lesson...) render inside <Outlet />.
 */
export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const menuButtonRef = useRef(null);

  function closeSidebar() {
    setSidebarOpen(false);
    menuButtonRef.current?.focus(); // back to where the user was (does nothing on desktop, where it's hidden)
  }

  return (
    <div className="min-h-dvh">
      <Sidebar id="sidebar" open={sidebarOpen} onClose={closeSidebar} />

      <div className="lg:pl-72">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-surface/90 px-4 backdrop-blur lg:hidden">
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-expanded={sidebarOpen}
            aria-controls="sidebar"
            className="rounded-lg p-2 text-muted hover:bg-subtle hover:text-ink"
            aria-label="Open navigation"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75Zm0 5A.75.75 0 0 1 2.75 9h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 9.75Zm0 5a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          <Logo />
        </header>

        <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8 lg:py-12">
          <ServerWakingNotice />
          {/* Shown while an on-demand page (see pages/lazyPages.js) downloads for the first time */}
          <Suspense fallback={<LoadingSpinner fullPage />}>
            <Outlet />
          </Suspense>

          <footer className="mt-16 flex flex-wrap justify-center gap-x-5 gap-y-1 border-t border-line pt-6 text-xs text-muted">
            <Link to="/privacy" className="hover:text-ink">
              Privacy policy
            </Link>
            <a
              href="https://github.com/shreyashtrivedi/Edify"
              target="_blank"
              rel="noreferrer"
              className="hover:text-ink"
            >
              Source code
            </a>
          </footer>
        </main>
      </div>
    </div>
  );
}
