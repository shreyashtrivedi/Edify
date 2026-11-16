import { BookOpen, Plus } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { NavLink } from 'react-router';
import { useCourses } from '../hooks/useCourses';
import { coursePath } from '../utils/paths';
import Logo from './Logo';
import ServerStatus from './ServerStatus';
import ThemeToggle from './ThemeToggle';
import Skeleton from './ui/Skeleton';
import UserMenu from './UserMenu';

const navLinkClass = ({ isActive }) =>
  `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
    isActive ? 'bg-brand-soft font-medium text-brand' : 'text-muted hover:bg-subtle hover:text-ink'
  }`;

/**
 * Persistent left navigation: new course + the user's courses.
 * On mobile it slides in as a drawer (open state is owned by App):
 * - closed, it is `invisible` below the lg breakpoint, so its links can't receive keyboard focus
 *   or be read by screen readers while off-screen (sliding it away alone doesn't do that);
 * - opening moves focus into it, and Escape closes it.
 */
export default function Sidebar({ id, open, onClose }) {
  const { courses, status } = useCourses();
  const asideRef = useRef(null);

  useEffect(() => {
    if (open) asideRef.current?.querySelector('a, button')?.focus();
  }, [open]);

  return (
    <>
      {/* Backdrop (mobile only) */}
      <div
        className={`fixed inset-0 z-30 bg-black/40 transition-opacity lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        ref={asideRef}
        id={id}
        // The new state's transition applies. Opening: visible at once (so focus can move in).
        // Closing: visibility is transitioned too, so it turns invisible only after sliding out.
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-line bg-surface lg:translate-x-0 ${
          open
            ? 'translate-x-0 transition-[translate]'
            : '-translate-x-full transition-[translate,visibility] max-lg:invisible'
        }`}
        aria-label="Sidebar"
        onKeyDown={(event) => open && event.key === 'Escape' && onClose()}
      >
        <div className="flex h-16 items-center px-5">
          <Logo />
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-2" onClick={onClose}>
          <NavLink
            to="/"
            end
            className="flex items-center justify-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-on-brand shadow-sm hover:bg-brand-strong"
          >
            <Plus className="size-4" aria-hidden="true" /> New course
          </NavLink>

          <p className="px-3 pt-6 pb-2 text-xs font-semibold tracking-wide text-muted uppercase">
            My courses
          </p>

          {status === 'loading' && (
            <div className="space-y-2 px-3">
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          )}
          {status === 'idle' && (
            <p className="px-3 text-sm text-muted">Log in to create courses and find them here.</p>
          )}
          {status === 'ready' && courses.length === 0 && (
            <p className="px-3 text-sm text-muted">Your generated courses will appear here.</p>
          )}
          <ul className="space-y-0.5">
            {courses.map((course) => (
              <li key={course._id}>
                <NavLink to={coursePath(course._id)} className={navLinkClass} title={course.title}>
                  <BookOpen className="size-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{course.title}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-3 border-t border-line px-4 py-4">
          <UserMenu />
          <div className="flex items-center justify-between gap-2 pl-1">
            <ServerStatus />
            <ThemeToggle />
          </div>
        </div>
      </aside>
    </>
  );
}
