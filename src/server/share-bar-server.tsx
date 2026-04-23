import { type CSSProperties, type ReactNode } from 'react';
import { defaultPlatforms, findPlatform, type SharePlatform, type ShareContext } from '../platforms';
import { applyUtmTags, platformUtmTags, type UtmTags } from '../services/utm-service';
import { PlatformIcon } from '../components/platform-icon';

export interface ShareBarServerProps {
  /** Absolute URL being shared. Required server-side (no `window` fallback). */
  url: string;
  title?: string;
  description?: string;
  /** Restrict to these platform ids (in order). Default: all built-ins. */
  platforms?: string[];
  /** Pass a custom platform list — useful for tree-shaking unwanted platforms. */
  registry?: SharePlatform[];
  utm?: UtmTags;
  size?: number;
  /** Render label text next to each icon. */
  showLabels?: boolean;
  /** Extra class for the wrapper. */
  className?: string;
  style?: CSSProperties;
  prefix?: ReactNode;
}

/**
 * Server-safe share bar — pure `<a target="_blank">` tags. Ships zero JS to
 * the client. Use this in React Server Components when interactive features
 * (clipboard, Web Share API, click handlers) are not needed.
 *
 * For interactive variants, import from the package main entry instead.
 */
export function ShareBarServer({
  url,
  title,
  description,
  platforms,
  registry = defaultPlatforms,
  utm,
  size = 20,
  showLabels = false,
  className,
  style,
  prefix,
}: ShareBarServerProps) {
  const list = platforms
    ? platforms.map((id) => findPlatform(registry, id)).filter((p): p is SharePlatform => Boolean(p))
    : registry;

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    ...style,
  };

  return (
    <div
      role="toolbar"
      aria-label={title ? `Share ${title}` : 'Share this page'}
      className={['caspian-share-bar', 'caspian-share-bar--server', className]
        .filter(Boolean)
        .join(' ')}
      style={containerStyle}
    >
      {prefix}
      {list.map((p) => {
        const ctx: ShareContext = {
          url: applyUtmTags(url, platformUtmTags(p.id, utm)),
          title,
          description,
        };
        const intentUrl = p.buildShareUrl(ctx);
        const linkStyle: CSSProperties = {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          borderRadius: 8,
          border: `1px solid ${p.color}`,
          backgroundColor: p.color,
          color: '#ffffff',
          fontSize: 14,
          fontWeight: 500,
          lineHeight: 1,
          textDecoration: 'none',
        };
        return (
          <a
            key={p.id}
            href={intentUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Share on ${p.label}`}
            className={`caspian-share-bar__link caspian-share-bar__link--${p.id}`}
            style={linkStyle}
          >
            <PlatformIcon platform={p.id} size={size} />
            {showLabels && <span>{p.label}</span>}
          </a>
        );
      })}
    </div>
  );
}
