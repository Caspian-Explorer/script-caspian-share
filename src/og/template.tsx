/**
 * Default OG image template — pure flexbox JSX returning a 1200×630 `<div>` tree
 * compatible with @vercel/og's `ImageResponse` (which uses satori under the
 * hood). satori only supports a subset of CSS — every node uses
 * `display: 'flex'` and absolute pixel sizing.
 *
 * Consumers replace the template wholesale by passing their own to
 * `createOgHandler({ template: MyTemplate })`. The signature is intentionally
 * runtime-neutral so the same JSX renders in @vercel/og, Cloudflare Workers
 * (workers-og), or Netlify Edge.
 */
import type { ReactElement } from 'react';

export interface OgTemplateProps {
  title: string;
  description?: string;
  /** Brand label shown in the footer, e.g. site name. */
  brand?: string;
  /** Theme preset id — `light` (default), `dark`, `midnight`, `rose`, `forest`. */
  theme?: 'light' | 'dark' | 'midnight' | 'rose' | 'forest';
  /** Override accent color (wins over the theme preset). */
  accent?: string;
  /** Footer text on the right side (e.g. URL slug, author). */
  footer?: string;
}

interface OgPalette {
  background: string;
  surface: string;
  text: string;
  muted: string;
  accent: string;
  border: string;
}

const PALETTES: Record<NonNullable<OgTemplateProps['theme']>, OgPalette> = {
  light: {
    background: '#ffffff',
    surface: '#f8fafc',
    text: '#0f172a',
    muted: '#475569',
    accent: '#6366f1',
    border: '#e2e8f0',
  },
  dark: {
    background: '#0f172a',
    surface: '#1e293b',
    text: '#f8fafc',
    muted: '#94a3b8',
    accent: '#818cf8',
    border: '#334155',
  },
  midnight: {
    background: '#1e1b4b',
    surface: '#312e81',
    text: '#ede9fe',
    muted: '#c4b5fd',
    accent: '#a78bfa',
    border: '#4338ca',
  },
  rose: {
    background: '#fff1f2',
    surface: '#ffe4e6',
    text: '#881337',
    muted: '#9f1239',
    accent: '#e11d48',
    border: '#fda4af',
  },
  forest: {
    background: '#f0fdf4',
    surface: '#dcfce7',
    text: '#14532d',
    muted: '#166534',
    accent: '#15803d',
    border: '#86efac',
  },
};

export function OgImageTemplate({
  title,
  description,
  brand,
  theme = 'light',
  accent,
  footer,
}: OgTemplateProps): ReactElement {
  const palette = PALETTES[theme];
  const accentColor = accent ?? palette.accent;

  return (
    <div
      style={{
        width: '1200px',
        height: '630px',
        display: 'flex',
        flexDirection: 'column',
        background: palette.background,
        padding: '64px',
        fontFamily: 'sans-serif',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '12px',
          background: accentColor,
          display: 'flex',
        }}
      />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          justifyContent: 'center',
          gap: 24,
        }}
      >
        {brand && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              fontSize: 28,
              fontWeight: 600,
              color: accentColor,
              textTransform: 'uppercase',
              letterSpacing: 2,
            }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 999,
                background: accentColor,
                display: 'flex',
              }}
            />
            <span>{brand}</span>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            fontSize: title.length > 60 ? 64 : 80,
            fontWeight: 800,
            color: palette.text,
            lineHeight: 1.05,
            letterSpacing: -1,
          }}
        >
          {title}
        </div>

        {description && (
          <div
            style={{
              display: 'flex',
              fontSize: 32,
              fontWeight: 400,
              color: palette.muted,
              lineHeight: 1.35,
              maxWidth: 1000,
            }}
          >
            {description.length > 200 ? `${description.slice(0, 197)}…` : description}
          </div>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 24,
          borderTop: `2px solid ${palette.border}`,
          fontSize: 24,
          color: palette.muted,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: palette.text, fontWeight: 600 }}>Share</span>
          <span style={{ color: palette.muted }}>•</span>
          <span>{theme}</span>
        </div>
        {footer && <div style={{ display: 'flex', color: palette.muted }}>{footer}</div>}
      </div>
    </div>
  );
}
