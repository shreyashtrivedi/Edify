import { Monitor, Moon, Sun } from 'lucide-react';
import { useId } from 'react';
import { useTheme } from '../hooks/useTheme';

const OPTIONS = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Monitor },
];

/**
 * Light / Dark / System switch.
 *
 * Built from real radio inputs (visually hidden) so keyboard and screen-reader support come
 * for free: one Tab stop, arrow keys move between options, and screen readers announce
 * the "Theme" group and then e.g. "Dark, radio button, 2 of 3".
 */
export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const name = useId();

  return (
    <fieldset className="flex rounded-lg bg-subtle p-0.5">
      <legend className="sr-only">Theme</legend>
      {OPTIONS.map(({ value, label, Icon }) => (
        <label
          key={value}
          title={label}
          className="grid size-7 cursor-pointer place-items-center rounded-md text-muted transition-colors hover:text-ink has-checked:bg-surface has-checked:text-ink has-checked:shadow-sm has-focus-visible:outline-2 has-focus-visible:outline-brand"
        >
          <input
            type="radio"
            name={name}
            value={value}
            checked={theme === value}
            onChange={() => setTheme(value)}
            className="sr-only"
          />
          <Icon className="size-4" aria-hidden="true" />
          <span className="sr-only">{label}</span>
        </label>
      ))}
    </fieldset>
  );
}
