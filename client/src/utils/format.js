/** 780 → "13:00", 3730 → "1:02:10" */
export function formatDuration(totalSeconds = 0) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`;
}

/** "React Hooks: From Zero to Hero!" → "react-hooks-from-zero-to-hero" (safe file names) */
export function slugify(text = '') {
  return (
    text
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '') // drop accents: é → e
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'edify'
  );
}
