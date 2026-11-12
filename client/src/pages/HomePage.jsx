export default function HomePage() {
  return (
    <section className="py-10 sm:py-16">
      <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
        ✦ AI-powered course generator
      </p>
      <h1 className="font-display text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
        What do you want to learn today?
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-muted">
        Type any topic and Edify builds a complete course for you: modules, lessons, code
        examples, videos and quizzes.
      </p>
    </section>
  );
}
