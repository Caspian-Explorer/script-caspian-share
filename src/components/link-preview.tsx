import type { CSSProperties, ReactNode } from 'react';
import { useOgMetadata } from '../hooks/use-og-metadata';
import { useTheme } from '../theme/theme-provider';
import { useCaspianImage } from '../provider/caspian-share-provider';
import { cn } from '../utils/cn';

export type LinkPreviewLayout = 'compact' | 'card';

export interface LinkPreviewProps {
  /** URL to preview. Falls back to provider default. */
  url?: string;
  /** Card (image on top) or compact (image on left). Default `card`. */
  layout?: LinkPreviewLayout;
  /** Render content while metadata is loading. Default: skeleton. */
  loadingFallback?: ReactNode;
  /** Render content when Firebase isn't configured or fetch failed. Default: nothing. */
  fallback?: ReactNode;
  /** Hide the image even if one is returned. */
  hideImage?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * Renders a small Open Graph preview card for a URL — title, description, image,
 * site name. Backed by `useOgMetadata` which uses Firestore + the
 * `caspianShareFetchOgMetadata` Cloud Function (SSRF-hardened).
 *
 * Renders the `fallback` (default: nothing) when Firebase isn't configured.
 */
export function LinkPreview({
  url,
  layout = 'card',
  loadingFallback,
  fallback,
  hideImage = false,
  className,
  style,
}: LinkPreviewProps) {
  const theme = useTheme();
  const Image = useCaspianImage();
  const { data, loading, error, enabled } = useOgMetadata(url);

  if (!enabled) return <>{fallback ?? null}</>;
  if (error) return <>{fallback ?? null}</>;
  if (loading) return <>{loadingFallback ?? <LinkPreviewSkeleton theme={theme} layout={layout} />}</>;
  if (!data) return null;

  const isCompact = layout === 'compact';

  const containerStyle: CSSProperties = {
    display: isCompact ? 'flex' : 'block',
    flexDirection: isCompact ? 'row' : undefined,
    alignItems: isCompact ? 'stretch' : undefined,
    border: `1px solid ${theme.border}`,
    borderRadius: theme.radius,
    overflow: 'hidden',
    background: theme.surface,
    color: theme.onSurface,
    fontFamily: 'inherit',
    textDecoration: 'none',
    maxWidth: 480,
    ...style,
  };

  const imageWrap: CSSProperties = {
    flexShrink: 0,
    width: isCompact ? 96 : '100%',
    height: isCompact ? 96 : 220,
    background: theme.border,
    overflow: 'hidden',
    position: 'relative',
  };

  const body: CSSProperties = {
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    minWidth: 0,
    flex: 1,
  };

  const titleStyle: CSSProperties = {
    fontSize: isCompact ? 14 : 16,
    fontWeight: 600,
    lineHeight: 1.3,
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    color: theme.onSurface,
  };

  const descriptionStyle: CSSProperties = {
    fontSize: isCompact ? 12 : 13,
    color: theme.onSurface,
    opacity: 0.7,
    lineHeight: 1.4,
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  };

  const siteStyle: CSSProperties = {
    fontSize: 11,
    color: theme.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: 600,
    marginTop: 2,
  };

  const target = data.resolvedUrl ?? data.url ?? url ?? '#';

  return (
    <a
      href={target}
      target="_blank"
      rel="noopener noreferrer"
      className={cn('caspian-link-preview', `caspian-link-preview--${layout}`, className)}
      style={containerStyle}
    >
      {!hideImage && data.image && (
        <div style={imageWrap}>
          <Image
            src={data.image}
            alt={data.imageAlt ?? data.title ?? ''}
            fill
            loading="lazy"
          />
        </div>
      )}
      <div style={body}>
        {data.siteName && <div style={siteStyle}>{data.siteName}</div>}
        {data.title && <div style={titleStyle}>{data.title}</div>}
        {data.description && <div style={descriptionStyle}>{data.description}</div>}
      </div>
    </a>
  );
}

function LinkPreviewSkeleton({
  theme,
  layout,
}: {
  theme: ReturnType<typeof useTheme>;
  layout: LinkPreviewLayout;
}) {
  const isCompact = layout === 'compact';
  return (
    <div
      aria-busy="true"
      style={{
        display: isCompact ? 'flex' : 'block',
        border: `1px solid ${theme.border}`,
        borderRadius: theme.radius,
        background: theme.surface,
        maxWidth: 480,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: isCompact ? 96 : '100%',
          height: isCompact ? 96 : 200,
          background: theme.border,
          opacity: 0.4,
        }}
      />
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        <div style={{ width: 80, height: 10, background: theme.border, opacity: 0.4, borderRadius: 4 }} />
        <div style={{ width: '70%', height: 14, background: theme.border, opacity: 0.5, borderRadius: 4 }} />
        <div style={{ width: '90%', height: 12, background: theme.border, opacity: 0.4, borderRadius: 4 }} />
      </div>
    </div>
  );
}
