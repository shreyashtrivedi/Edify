import { NavLink } from 'react-router';
import Logo from './Logo';
import ServerStatus from './ServerStatus';

const navLinkClass = ({ isActive }) =>
  `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-brand-soft text-brand' : 'text-muted hover:bg-subtle hover:text-ink'
  }`;

/**
 * Persistent left navigation. On mobile it slides in as a drawer (controlled by App).
 */
export default function Sidebar({ open, onClose }) {
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
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-line bg-surface transition-transform lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Sidebar"
      >
        <div className="flex h-16 items-center px-5">
          <Logo />
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2" onClick={onClose}>
          <NavLink to="/" end className={navLinkClass}>
            <span aria-hidden="true">✦</span> New course
          </NavLink>

          <p className="px-3 pt-6 pb-2 text-xs font-semibold tracking-wide text-muted uppercase">
            My courses
          </p>
          <p className="px-3 text-sm text-muted">Your generated courses will appear here.</p>
        </nav>

        <div className="border-t border-line px-5 py-4">
          <ServerStatus />
        </div>
      </aside>
    </>
  );
}
