import { useAuth0 } from '@auth0/auth0-react';
import { FileText, Layers, ListChecks, LockKeyhole } from 'lucide-react';
import ErrorMessage from '../ui/ErrorMessage';

const FEATURES = [
  {
    icon: Layers,
    title: 'A structured outline',
    text: '3 to 6 modules that build from the foundations to real-world application.',
  },
  {
    icon: FileText,
    title: 'Rich lessons',
    text: 'Clear explanations, code examples, practical tips and a matching video.',
  },
  {
    icon: ListChecks,
    title: 'Quizzes',
    text: 'Check your understanding at the end of every lesson, with explanations.',
  },
  {
    icon: LockKeyhole,
    title: 'Your private library',
    text: 'Courses are saved to your account, so you can continue on any device.',
  },
];

const STEPS = [
  ['Describe a topic', 'Anything from "Intro to React Hooks" to "Basics of copyright law".'],
  ['Get your course', 'Edify designs a full outline in a few seconds.'],
  ['Learn lesson by lesson', 'Each lesson is written the moment you open it.'],
];

/** Home page for visitors who are not logged in. */
export default function Landing() {
  const { loginWithRedirect, error } = useAuth0(); // error: why the last login attempt failed

  return (
    <div className="space-y-16">
      <section className="pt-4 sm:pt-10">
        {error && (
          <div className="mb-8">
            <ErrorMessage title="Login failed" message={error.message} />
          </div>
        )}
        <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
          ✦ AI-powered course generator
        </p>
        <h1 className="max-w-3xl font-display text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
          Turn any topic into a complete course.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">
          Type what you want to learn. Edify designs the modules, writes every lesson with examples,
          finds a video and quizzes you as you go.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => loginWithRedirect({ authorizationParams: { screen_hint: 'signup' } })}
            className="rounded-xl bg-brand px-5 py-3 font-semibold text-on-brand shadow-sm hover:bg-brand-strong"
          >
            Get started, it&apos;s free
          </button>
          <button
            type="button"
            onClick={() => loginWithRedirect()}
            className="rounded-xl border border-line bg-surface px-5 py-3 font-semibold hover:bg-subtle"
          >
            Log in
          </button>
        </div>
      </section>

      <section aria-labelledby="features-heading">
        <h2 id="features-heading" className="sr-only">
          Features
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <li key={title} className="rounded-2xl border border-line bg-surface p-5">
              <Icon className="size-6 text-brand" aria-hidden="true" />
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="steps-heading">
        <h2 id="steps-heading" className="mb-4 text-lg font-semibold">
          How it works
        </h2>
        <ol className="grid gap-4 sm:grid-cols-3">
          {STEPS.map(([title, text], index) => (
            <li key={title} className="flex gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-soft text-sm font-semibold text-brand">
                {index + 1}
              </span>
              <div>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
