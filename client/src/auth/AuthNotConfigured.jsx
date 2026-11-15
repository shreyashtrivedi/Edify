/** Shown instead of the app when the Auth0 environment variables are missing. */
export default function AuthNotConfigured() {
  return (
    <main className="mx-auto max-w-xl px-4 py-24">
      <h1 className="font-display text-3xl font-semibold">Login is not configured</h1>
      <p className="mt-4 text-muted">
        Create <code className="rounded bg-subtle px-1.5 py-0.5 font-mono text-sm">client/.env.local</code> with
        your Auth0 settings, then restart the dev server:
      </p>
      <pre className="mt-4 overflow-x-auto rounded-xl bg-subtle p-4 font-mono text-sm">
        {`VITE_AUTH0_DOMAIN=your-tenant.us.auth0.com
VITE_AUTH0_CLIENT_ID=your-client-id
VITE_AUTH0_AUDIENCE=https://edify-api`}
      </pre>
    </main>
  );
}
