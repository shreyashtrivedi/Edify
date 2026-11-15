/**
 * Theme helpers (plain JS, no React).
 *
 * The user picks 'light', 'dark' or 'system' ('system' follows the OS setting). The resolved
 * theme is applied by toggling the `.dark` class on <html>, which swaps the colour variables
 * defined in index.css. Components never need to know which theme is active.
 *
 * index.html contains a tiny inline copy of this logic that runs before the first paint, so a
 * dark-mode user never sees a white flash while the JS bundle loads. Keep THEME_STORAGE_KEY and
 * THEME_COLORS in sync with it.
 */
export const THEME_STORAGE_KEY = 'edify-theme';
export const THEMES = ['light', 'dark', 'system'];

/** Mobile browser bar colour: matches the app's top bar (the `--surface` token) in each theme. */
export const THEME_COLORS = { light: '#ffffff', dark: '#18181b' };

const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)');

/** The saved choice, or 'system' if nothing (valid) is saved. */
export function readStoredTheme() {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return THEMES.includes(saved) ? saved : 'system';
  } catch {
    return 'system'; // storage blocked (some private modes / strict privacy settings)
  }
}

/** 'system' is the default, so it's stored as "nothing saved". */
export function storeTheme(theme) {
  try {
    if (theme === 'system') localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Not saved: the choice still applies until the tab is closed.
  }
}

/** What the OS currently prefers: 'light' or 'dark'. */
export function systemTheme() {
  return darkQuery().matches ? 'dark' : 'light';
}

/** Calls `callback('light' | 'dark')` whenever the OS setting changes. Returns an unsubscribe function. */
export function watchSystemTheme(callback) {
  const query = darkQuery();
  const onChange = () => callback(query.matches ? 'dark' : 'light');
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

/** Applies a resolved theme ('light' | 'dark') to the page. */
export function applyTheme(resolved) {
  const root = document.documentElement;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', THEME_COLORS[resolved]);

  const isDark = resolved === 'dark';
  if (root.classList.contains('dark') === isDark) return; // already applied (e.g. by index.html)

  // Switch every colour in the same frame. Without this, elements with `transition-colors`
  // (buttons, links, cards) would fade over 150 ms while everything else changes instantly.
  const pause = document.createElement('style');
  pause.textContent = '*, *::before, *::after { transition: none !important; }';
  document.head.appendChild(pause);

  root.classList.toggle('dark', isDark);

  window.getComputedStyle(document.body).getPropertyValue('color'); // apply the new styles now, while transitions are off
  requestAnimationFrame(() => pause.remove());
}
