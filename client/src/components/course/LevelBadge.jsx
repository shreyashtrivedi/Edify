const STYLES = {
  beginner: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
  intermediate: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
  advanced: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300',
};

export default function LevelBadge({ level = 'beginner' }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${STYLES[level] ?? STYLES.beginner}`}
    >
      {level}
    </span>
  );
}
