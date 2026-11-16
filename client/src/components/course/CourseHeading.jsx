import LevelBadge from './LevelBadge';

/** Level, tags, title and description at the top of a course page (own or shared). */
export default function CourseHeading({ course }) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <LevelBadge level={course.level} />
        {course.tags.map((tag) => (
          <span key={tag} className="rounded-full bg-subtle px-2.5 py-0.5 text-xs text-muted">
            #{tag}
          </span>
        ))}
      </div>
      <h1 className="mt-4 font-display text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
        {course.title}
      </h1>
      <p className="mt-3 max-w-3xl text-lg text-muted">{course.description}</p>
    </>
  );
}
