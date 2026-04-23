import { type CSSProperties, type ReactNode } from 'react';
import { usePlatformRegistry } from '../provider/platform-registry';
import { useTheme } from '../theme/theme-provider';
import { useT } from '../i18n/locale-provider';
import { ShareButton, type ShareButtonShape, type ShareButtonSize, type ShareButtonVariant } from './share-button';
import { CopyLinkButton } from './copy-link-button';
import { NativeShareButton } from './native-share-button';
import { cn } from '../utils/cn';
import type { UseShareInput } from '../hooks/use-share';

export type ShareBarLayout = 'inline' | 'sidebar';
export type ShareBarSidebarSide = 'left' | 'right';

export interface ShareBarProps {
  /** URL being shared. Falls back to provider default, then `window.location.href`. */
  url?: string;
  /** Title used in share intents. Falls back to provider default. */
  title?: string;
  /** Restrict to these platform ids in this order. Default: all registered. */
  platforms?: string[];
  /** Layout mode. `sidebar` floats on screen edge; `inline` is a normal row. */
  layout?: ShareBarLayout;
  /** When `layout="sidebar"`, which side to dock. */
  side?: ShareBarSidebarSide;
  /** When `layout="sidebar"`, distance from viewport top. */
  topOffset?: number | string;
  /** Show a copy-link button at the end. */
  includeCopyLink?: boolean;
  /** Show a native-share button at the start (mobile share sheet). */
  includeNative?: boolean;
  size?: ShareButtonSize;
  variant?: ShareButtonVariant;
  shape?: ShareButtonShape;
  showLabels?: boolean;
  className?: string;
  style?: CSSProperties;
  /** Optional content rendered before the platform buttons (e.g. a "Share this" label). */
  prefix?: ReactNode;
}

export function ShareBar({
  url,
  title,
  platforms,
  layout = 'inline',
  side = 'right',
  topOffset = '40%',
  includeCopyLink = true,
  includeNative = false,
  size = 'md',
  variant,
  shape = 'rounded',
  showLabels = false,
  className,
  style,
  prefix,
}: ShareBarProps) {
  const { platforms: registry } = usePlatformRegistry();
  const theme = useTheme();
  const t = useT();
  const list = platforms
    ? platforms
        .map((id) => registry.find((p) => p.id === id))
        .filter((p): p is NonNullable<typeof p> => Boolean(p))
    : registry;

  const context: UseShareInput = { url, title };

  const isSidebar = layout === 'sidebar';
  const containerStyle: CSSProperties = isSidebar
    ? {
        position: 'fixed',
        [side]: 12,
        top: typeof topOffset === 'number' ? `${topOffset}px` : topOffset,
        transform: 'translateY(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: 8,
        background: theme.surface,
        border: `1px solid ${theme.border}`,
        borderRadius: theme.radius + 4,
        boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
        zIndex: 50,
        ...style,
      }
    : {
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
      aria-label={title ? `Share ${title}` : t('bar.label')}
      className={cn(
        'caspian-share-bar',
        `caspian-share-bar--${layout}`,
        isSidebar && `caspian-share-bar--${side}`,
        className,
      )}
      style={containerStyle}
    >
      {prefix}
      {includeNative && (
        <NativeShareButton
          url={url}
          title={title}
          size={size}
          variant={variant}
          shape={shape}
          showLabel={showLabels}
        />
      )}
      {list.map((p) => (
        <ShareButton
          key={p.id}
          platform={p.id}
          context={context}
          size={size}
          variant={variant}
          shape={shape}
          showLabel={showLabels}
        />
      ))}
      {includeCopyLink && (
        <CopyLinkButton
          url={url}
          size={size}
          variant={variant}
          shape={shape}
          showLabel={showLabels}
        />
      )}
    </div>
  );
}
