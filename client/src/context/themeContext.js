import { createContext } from 'react';

/**
 * Holds { theme, resolvedTheme, setTheme }. See ThemeProvider.
 * theme: what the user picked ('light' | 'dark' | 'system')
 * resolvedTheme: what is actually shown ('light' | 'dark')
 */
export const ThemeContext = createContext(null);
