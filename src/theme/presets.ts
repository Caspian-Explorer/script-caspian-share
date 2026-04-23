import type { ShareTheme, NormalizedShareTheme } from './types';

/** Default tokens applied when the consumer doesn't supply a theme. */
export const DEFAULT_THEME: NormalizedShareTheme = {
  primary: '#111827',
  surface: '#ffffff',
  onSurface: '#111827',
  border: '#e5e7eb',
  backdrop: 'rgba(15, 23, 42, 0.55)',
  radius: 8,
  platformColors: {},
  variant: 'branded',
};

/** Curated theme presets. Spread one then override fields:
 *
 *   <CaspianShareProvider theme={{ ...THEME_PRESETS.midnight, primary: '#ff6b00' }}>
 */
export const THEME_PRESETS = {
  light: {
    ...DEFAULT_THEME,
  },
  dark: {
    ...DEFAULT_THEME,
    primary: '#f9fafb',
    surface: '#0f172a',
    onSurface: '#f9fafb',
    border: '#1f2937',
    backdrop: 'rgba(0, 0, 0, 0.7)',
  },
  midnight: {
    ...DEFAULT_THEME,
    primary: '#7c3aed',
    surface: '#1e1b4b',
    onSurface: '#ede9fe',
    border: '#312e81',
    backdrop: 'rgba(30, 27, 75, 0.7)',
    radius: 12,
  },
  rose: {
    ...DEFAULT_THEME,
    primary: '#e11d48',
    surface: '#fff1f2',
    onSurface: '#881337',
    border: '#fecdd3',
    radius: 12,
  },
  forest: {
    ...DEFAULT_THEME,
    primary: '#15803d',
    surface: '#f0fdf4',
    onSurface: '#14532d',
    border: '#bbf7d0',
    radius: 8,
  },
  monoLight: {
    ...DEFAULT_THEME,
    variant: 'monochrome' as const,
    primary: '#111827',
  },
  monoDark: {
    ...DEFAULT_THEME,
    variant: 'monochrome' as const,
    primary: '#f9fafb',
    surface: '#0f172a',
    onSurface: '#f9fafb',
    border: '#1f2937',
    backdrop: 'rgba(0, 0, 0, 0.7)',
  },
  outlined: {
    ...DEFAULT_THEME,
    variant: 'outlined' as const,
  },
} satisfies Record<string, NormalizedShareTheme>;

export type ThemePresetName = keyof typeof THEME_PRESETS;

export function normalizeTheme(theme?: ShareTheme): NormalizedShareTheme {
  if (!theme) return DEFAULT_THEME;
  return {
    primary: theme.primary ?? DEFAULT_THEME.primary,
    surface: theme.surface ?? DEFAULT_THEME.surface,
    onSurface: theme.onSurface ?? DEFAULT_THEME.onSurface,
    border: theme.border ?? DEFAULT_THEME.border,
    backdrop: theme.backdrop ?? DEFAULT_THEME.backdrop,
    radius: theme.radius ?? DEFAULT_THEME.radius,
    platformColors: theme.platformColors ?? {},
    variant: theme.variant ?? DEFAULT_THEME.variant,
  };
}

/**
 * Returns the visible color for a platform — checks per-theme override first,
 * falls back to the platform's built-in brand color.
 */
export function resolvePlatformColor(theme: NormalizedShareTheme, platformId: string, fallback: string): string {
  return theme.platformColors[platformId] ?? fallback;
}
