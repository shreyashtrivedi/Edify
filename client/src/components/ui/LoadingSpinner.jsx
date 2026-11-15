import { LoaderCircle } from 'lucide-react';

/** Spinner with an optional label. `fullPage` centres it in the content area. */
export default function LoadingSpinner({ label = 'Loading…', fullPage = false }) {
  return (
    <div
      className={`flex items-center justify-center gap-3 text-muted ${fullPage ? 'py-32' : 'py-8'}`}
      role="status"
    >
      <LoaderCircle className="size-5 animate-spin text-brand" aria-hidden="true" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
