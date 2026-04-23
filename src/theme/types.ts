/**
 * Theme tokens consumed by Caspian Share components. All fields optional —
 * components apply per-platform brand colors as the default and only fall back
 * to theme tokens for non-platform surfaces (dialog chrome, copy-link, etc.).
 */
export interface ShareTheme {
  /** Primary brand color used on copy-link, native share, dialog accents. */
  primary?: string;
  /** Background color for surfaces (dialog, dropdown, sidebar). */
  surface?: string;
  /** Foreground (text) color on surface. */
  onSurface?: string;
  /** Subtle border color (dialog separators). */
  border?: string;
  /** Backdrop overlay color (dialog scrim). */
  backdrop?: string;
  /** Border radius in px for buttons + surfaces. */
  radius?: number;
  /** Per-platform color overrides — wins over the platform's built-in `color`. */
  platformColors?: Record<string, string>;
  /**
   * Visual style. `branded` paints buttons in their platform color (default);
   * `monochrome` uses `primary` for everything; `outlined` uses transparent
   * backgrounds with platform-color borders.
   */
  variant?: 'branded' | 'monochrome' | 'outlined';
}

export interface NormalizedShareTheme {
  primary: string;
  surface: string;
  onSurface: string;
  border: string;
  backdrop: string;
  radius: number;
  platformColors: Record<string, string>;
  variant: 'branded' | 'monochrome' | 'outlined';
}
