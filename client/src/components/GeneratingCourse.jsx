import { Check, LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

const STEPS = [
  'Understanding your topic',
  'Designing the curriculum',
  'Structuring modules from basics to advanced',
  'Writing lesson titles',
  'Saving your course',
];

/**
 * Shown while the outline is generated (a single AI call, ~5-15s). The steps describe
 * what the model is doing and advance on a timer, so the wait feels shorter and the user
 * knows the app hasn't frozen. The last step stays active until the response arrives.
 */
export default function GeneratingCourse({ topic }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 2500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-8" role="status">
      <p className="text-sm text-muted">Building your course on</p>
      <p className="mt-1 font-display text-2xl font-semibold">“{topic}”</p>

      <ol className="mt-6 space-y-3">
        {STEPS.map((label, index) => (
          <li
            key={label}
            className={`flex items-center gap-3 text-sm transition-opacity ${index > step ? 'opacity-40' : ''}`}
          >
            {index < step ? (
              <Check className="size-5 text-emerald-500" aria-hidden="true" />
            ) : index === step ? (
              <LoaderCircle className="size-5 animate-spin text-brand" aria-hidden="true" />
            ) : (
              <span className="size-5 rounded-full border-2 border-line" aria-hidden="true" />
            )}
            {label}
          </li>
        ))}
      </ol>
    </div>
  );
}
