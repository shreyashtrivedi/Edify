/** Grey pulsing placeholder used while content loads. */
export default function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-md bg-subtle ${className}`} aria-hidden="true" />;
}

/** A skeleton shaped like a lesson: title, paragraphs, a code block. */
export function LessonSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-11/12" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="mt-8 h-6 w-1/2" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="mt-6 h-36 w-full rounded-xl" />
    </div>
  );
}
