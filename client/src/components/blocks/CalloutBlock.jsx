import { Info, Lightbulb, TriangleAlert } from 'lucide-react';
import InlineText from './InlineText';

const VARIANTS = {
  tip: {
    label: 'Tip',
    Icon: Lightbulb,
    className:
      'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100',
  },
  note: {
    label: 'Note',
    Icon: Info,
    className: 'border-brand/25 bg-brand-soft text-ink',
  },
  warning: {
    label: 'Watch out',
    Icon: TriangleAlert,
    className:
      'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100',
  },
};

export default function CalloutBlock({ variant = 'note', text }) {
  const { label, Icon, className } = VARIANTS[variant] ?? VARIANTS.note;
  return (
    <aside className={`my-6 flex gap-3 rounded-xl border p-4 ${className}`}>
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div className="leading-7">
        <span className="font-semibold">{label}: </span>
        <InlineText text={text} />
      </div>
    </aside>
  );
}
