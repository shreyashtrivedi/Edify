import { useServerStatus } from '../hooks/useServerStatus';

const STATES = {
  checking: { label: 'Connecting…', dot: 'bg-amber-400 animate-pulse' },
  waking: { label: 'Waking up server…', dot: 'bg-amber-400 animate-pulse' },
  online: { label: 'API online', dot: 'bg-emerald-500' },
  offline: { label: 'API offline', dot: 'bg-red-500' },
};

export default function ServerStatus() {
  const status = useServerStatus();
  const { label, dot } = STATES[status];

  return (
    <div className="flex items-center gap-2 text-xs text-muted" role="status">
      <span className={`size-2 rounded-full ${dot}`} aria-hidden="true" />
      {label}
    </div>
  );
}
