import { useContext } from 'react';
import { ThemeContext } from '../context/themeContext';

/** Access the theme: { theme, resolvedTheme, setTheme } */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside <ThemeProvider>');
  return context;
}
