import { Link } from 'react-router';

export default function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5 rounded-lg" aria-label="Edify home">
      <img src="/favicon.svg" alt="" className="size-8" />
      <span className="font-display text-xl font-semibold tracking-tight">Edify</span>
    </Link>
  );
}
