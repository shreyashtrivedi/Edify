import { Link } from 'react-router';

export default function NotFoundPage() {
  return (
    <section className="py-24 text-center">
      <p className="font-display text-6xl font-semibold text-brand">404</p>
      <h1 className="mt-4 text-2xl font-semibold">This page doesn&apos;t exist</h1>
      <p className="mt-2 text-muted">The link may be broken, or the page may have been removed.</p>
      <Link
        to="/"
        className="mt-8 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-on-brand hover:bg-brand-strong"
      >
        Back to home
      </Link>
    </section>
  );
}
