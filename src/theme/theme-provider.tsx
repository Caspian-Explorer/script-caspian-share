import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { DEFAULT_THEME, normalizeTheme } from './presets';
import type { NormalizedShareTheme, ShareTheme } from './types';

const ThemeContext = createContext<NormalizedShareTheme | null>(null);

export interface ThemeProviderProps {
  theme?: ShareTheme;
  children: ReactNode;
}

export function ThemeProvider({ theme, children }: ThemeProviderProps) {
  const value = useMemo(() => normalizeTheme(theme), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): NormalizedShareTheme {
  return useContext(ThemeContext) ?? DEFAULT_THEME;
}
