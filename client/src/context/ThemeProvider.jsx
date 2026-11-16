import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  THEME_STORAGE_KEY,
  applyTheme,
  readStoredTheme,
  storeTheme,
  systemTheme,
  watchSystemTheme,
} from '../utils/theme';
import { ThemeContext } from './themeContext';

/**
 * Owns the light / dark / system choice.
 *
 * - The choice is saved in localStorage, so it survives reloads.
 * - On 'system', the page follows the OS setting live (e.g. the OS switches to dark at sunset).
 * - Other open tabs follow a change too (the `storage` event fires in every *other* tab).
 */
export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readStoredTheme);
  const [osTheme, setOsTheme] = useState(systemTheme);
  const resolvedTheme = theme === 'system' ? osTheme : theme;

  useEffect(() => watchSystemTheme(setOsTheme), []);

  useEffect(() => {
    function onStorage(event) {
      // key === null means localStorage.clear() was called
      if (event.key === THEME_STORAGE_KEY || event.key === null) setThemeState(readStoredTheme());
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Layout effect: runs before the browser paints, so a switch never shows a half-themed frame.
  useLayoutEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  const setTheme = useCallback((next) => {
    storeTheme(next);
    setThemeState(next);
  }, []);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
