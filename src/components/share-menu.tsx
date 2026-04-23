import { useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useNativeShare } from '../hooks/use-native-share';
import { useShare, type UseShareInput } from '../hooks/use-share';
import { useShareUrl } from '../hooks/use-share-url';
import { useClipboard } from '../hooks/use-clipboard';
import { useOutsideClick } from '../hooks/use-outside-click';
import { useEscapeKey } from '../hooks/use-escape-key';
import { usePlatformRegistry } from '../provider/platform-registry';
import { useCaspianShareConfig } from '../provider/caspian-share-provider';
import { useTheme } from '../theme/theme-provider';
import { useT, useDirection } from '../i18n/locale-provider';
import { PlatformIcon } from './platform-icon';
import { cn } from '../utils/cn';
import type { ShareButtonShape, ShareButtonSize } from './share-button';

export interface ShareMenuProps {
  url?: string;
  title?: string;
  text?: string;
  /** Restrict the dropdown to these platform ids. Default: all registered. */
  platforms?: string[];
  /** Whether to use native share when available (mobile). Default true. */
  preferNative?: boolean;
  /** Whether the dropdown should include a copy-link entry. Default true. */
  includeCopyLink?: boolean;
  /** Trigger button styling. */
  size?: ShareButtonSize;
  shape?: ShareButtonShape;
  triggerLabel?: string;
  showLabel?: boolean;
  className?: string;
  style?: CSSProperties;
  /** Custom trigger renderer; receives `onClick` to open the menu. */
  renderTrigger?: (props: { onClick: () => void; ariaLabel: string }) => ReactNode;
}

const SIZE_PX = { sm: 16, md: 20, lg: 24 } as const;
const SIZE_PADDING = { sm: '6px 8px', md: '8px 12px', lg: '10px 16px' } as const;
const SHAPE_RADIUS = { square: '4px', rounded: '8px', circle: '999px' } as const;

export function ShareMenu({
  url,
  title,
  text,
  platforms,
  preferNative = true,
  includeCopyLink = true,
  size = 'md',
  shape = 'rounded',
  triggerLabel,
  showLabel = false,
  className,
  style,
  renderTrigger,
}: ShareMenuProps) {
  const { platforms: registry } = usePlatformRegistry();
  const { defaultTitle, defaultDescription } = useCaspianShareConfig();
  const theme = useTheme();
  const t = useT();
  const direction = useDirection();
  const { available, share } = useNativeShare();
  const { open: openIntent } = useShare();
  const { copy } = useClipboard();
  const resolvedUrl = useShareUrl({ url });

  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useOutsideClick([triggerRef, menuRef], () => setOpen(false), open);
  useEscapeKey(() => setOpen(false), open);

  const list = platforms
    ? platforms.map((id) => registry.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => Boolean(p))
    : registry;

  const handleTrigger = async () => {
    if (preferNative && available) {
      const ok = await share({
        url: resolvedUrl,
        title: title ?? defaultTitle,
        text: text ?? defaultDescription,
      });
      if (ok) return;
      // user cancelled — fall through to dropdown
    }
    setOpen((v) => !v);
  };

  const ariaLabel = triggerLabel ?? t('menu.openLabel');

  const triggerStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    border: `1px solid ${theme.primary}`,
    borderRadius: SHAPE_RADIUS[shape],
    padding: SIZE_PADDING[size],
    fontSize: size === 'sm' ? 13 : size === 'lg' ? 16 : 14,
    fontWeight: 500,
    lineHeight: 1,
    cursor: 'pointer',
    backgroundColor: theme.primary,
    color: theme.surface,
    ...style,
  };

  const menuStyle: CSSProperties = {
    position: 'absolute',
    top: '100%',
    [direction === 'rtl' ? 'right' : 'left']: 0,
    marginTop: 4,
    background: theme.surface,
    color: theme.onSurface,
    border: `1px solid ${theme.border}`,
    borderRadius: theme.radius,
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
    minWidth: 200,
    padding: 4,
    zIndex: 100,
    direction,
  };

  const itemBase: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    padding: '8px 10px',
    background: 'transparent',
    border: 'none',
    borderRadius: theme.radius,
    fontSize: 14,
    fontFamily: 'inherit',
    cursor: 'pointer',
    textAlign: direction === 'rtl' ? 'right' : 'left',
    color: theme.onSurface,
  };

  const ctx: UseShareInput = { url, title, body: text };

  const trigger = renderTrigger ? (
    renderTrigger({ onClick: handleTrigger, ariaLabel })
  ) : (
    <button
      ref={triggerRef}
      type="button"
      aria-haspopup="menu"
      aria-expanded={open}
      aria-label={ariaLabel}
      className={cn('caspian-share-menu__trigger', className)}
      style={triggerStyle}
      onClick={handleTrigger}
    >
      <PlatformIcon platform="native-share" size={SIZE_PX[size]} />
      {showLabel && <span>{triggerLabel ?? t('button.share')}</span>}
    </button>
  );

  return (
    <div className="caspian-share-menu" style={{ position: 'relative', display: 'inline-block' }}>
      {trigger}
      {open && (
        <div ref={menuRef} role="menu" className="caspian-share-menu__list" style={menuStyle}>
          {list.map((p) => (
            <button
              key={p.id}
              role="menuitem"
              type="button"
              style={itemBase}
              onMouseEnter={(e) => (e.currentTarget.style.background = theme.border)}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              onClick={() => {
                openIntent(p.id, ctx);
                setOpen(false);
              }}
            >
              <span style={{ color: p.color, display: 'inline-flex' }}>
                <PlatformIcon platform={p.id} size={18} />
              </span>
              <span>{p.label}</span>
            </button>
          ))}
          {includeCopyLink && (
            <button
              role="menuitem"
              type="button"
              style={{ ...itemBase, borderTop: `1px solid ${theme.border}`, marginTop: 4, paddingTop: 10 }}
              onMouseEnter={(e) => (e.currentTarget.style.background = theme.border)}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              onClick={() => {
                copy(resolvedUrl);
                setOpen(false);
              }}
            >
              <span style={{ color: theme.primary, display: 'inline-flex' }}>
                <PlatformIcon platform="copy-link" size={18} />
              </span>
              <span>{t('button.copyLink')}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
