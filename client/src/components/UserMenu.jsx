import { useAuth0 } from '@auth0/auth0-react';
import { LogIn, LogOut } from 'lucide-react';
import { useState } from 'react';

/** Circle with the profile picture, or the user's initials if there is none (or it fails to load). */
function Avatar({ user }) {
  const [failed, setFailed] = useState(false);
  const initials = (user.name || user.email || '?')
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

  if (user.picture && !failed) {
    return (
      <img
        src={user.picture}
        alt=""
        className="size-9 shrink-0 rounded-full bg-subtle object-cover"
        referrerPolicy="no-referrer" // Google profile pictures can refuse requests that send a referrer
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-sm font-semibold text-brand">
      {initials}
    </span>
  );
}

/** Sidebar footer: the logged-in user with a logout button, or login / sign-up buttons. */
export default function UserMenu() {
  const { user, isAuthenticated, isLoading, loginWithRedirect, logout } = useAuth0();

  if (isLoading) return <div className="h-9" aria-hidden="true" />;

  if (!isAuthenticated) {
    return (
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => loginWithRedirect()}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm font-medium hover:bg-subtle"
        >
          <LogIn className="size-4" aria-hidden="true" /> Log in
        </button>
        <button
          type="button"
          onClick={() => loginWithRedirect({ authorizationParams: { screen_hint: 'signup' } })}
          className="flex-1 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-on-brand hover:bg-brand-strong"
        >
          Sign up
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Avatar user={user} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{user.name || user.email}</p>
        {user.email && user.email !== user.name && (
          <p className="truncate text-xs text-muted">{user.email}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
        className="rounded-lg p-2 text-muted hover:bg-subtle hover:text-ink"
        title="Log out"
      >
        <LogOut className="size-4" aria-hidden="true" />
        <span className="sr-only">Log out</span>
      </button>
    </div>
  );
}
