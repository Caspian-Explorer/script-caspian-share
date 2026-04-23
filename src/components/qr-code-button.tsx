import { useRef, useState, type ButtonHTMLAttributes, type CSSProperties } from 'react';
import { Portal } from './portal';
import { PlatformIcon } from './platform-icon';
import { useShareUrl } from '../hooks/use-share-url';
import { useQrCode, type UseQrCodeOptions } from '../hooks/use-qr-code';
import { useOutsideClick } from '../hooks/use-outside-click';
import { useEscapeKey } from '../hooks/use-escape-key';
import { useTheme } from '../theme/theme-provider';
import { useT } from '../i18n/locale-provider';
import { cn } from '../utils/cn';
import type { ShareButtonShape, ShareButtonSize, ShareButtonVariant } from './share-button';

export interface QrCodeButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'onClick'> {
  url?: string;
  size?: ShareButtonSize;
  variant?: ShareButtonVariant;
  shape?: ShareButtonShape;
  showLabel?: boolean;
  label?: string;
  /** Pixel size of the rendered QR. Default 240. */
  qrSize?: number;
  /** Additional QR options forwarded to `useQrCode`. */
  qrOptions?: Omit<UseQrCodeOptions, 'size'>;
  /** Hide the download link in the popover. Default false. */
  hideDownload?: boolean;
  className?: string;
}

const SIZE_PX = { sm: 16, md: 20, lg: 24 } as const;
const SIZE_PADDING = { sm: '6px 8px', md: '8px 12px', lg: '10px 16px' } as const;
const SHAPE_RADIUS = { square: '4px', rounded: '8px', circle: '999px' } as const;

/**
 * Click to reveal a QR code containing the share URL. The `qrcode` peer
 * dependency is only loaded when the button is first activated, so the
 * package's main bundle stays lean for consumers who don't use it.
 */
export function QrCodeButton({
  url,
  size = 'md',
  variant,
  shape = 'rounded',
  showLabel = false,
  label,
  qrSize = 240,
  qrOptions,
  hideDownload = false,
  className,
  style,
  ...buttonProps
}: QrCodeButtonProps) {
  const theme = useTheme();
  const t = useT();
  const resolvedUrl = useShareUrl({ url });
  const [open, setOpen] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useOutsideClick([triggerRef, popoverRef], () => setOpen(false), open);
  useEscapeKey(() => setOpen(false), open);

  // Lazy-load qrcode only after the button is opened.
  const { dataUrl, loading, error } = useQrCode(open ? resolvedUrl : null, {
    size: qrSize,
    ...qrOptions,
  });

  const effectiveVariant = variant ?? theme.variant;
  const accent = theme.primary;

  const palette: CSSProperties =
    effectiveVariant === 'branded'
      ? { backgroundColor: accent, color: theme.surface, borderColor: accent }
      : effectiveVariant === 'monochrome'
        ? { backgroundColor: theme.primary, color: theme.surface, borderColor: theme.primary }
        : effectiveVariant === 'outlined'
          ? { backgroundColor: 'transparent', color: accent, borderColor: accent }
          : { backgroundColor: 'transparent', color: accent, borderColor: 'transparent' };

  const triggerStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    border: '1px solid',
    borderRadius: SHAPE_RADIUS[shape],
    padding: SIZE_PADDING[size],
    fontSize: size === 'sm' ? 13 : size === 'lg' ? 16 : 14,
    fontWeight: 500,
    lineHeight: 1,
    cursor: 'pointer',
    ...palette,
    ...style,
  };

  const popoverStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: theme.backdrop,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 16,
  };

  const cardStyle: CSSProperties = {
    background: theme.surface,
    color: theme.onSurface,
    borderRadius: theme.radius * 2,
    boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
    padding: 24,
    border: `1px solid ${theme.border}`,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  };

  const visibleLabel = label ?? 'QR';

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={visibleLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn('caspian-share-button', 'caspian-share-button--qr', className)}
        style={triggerStyle}
        onClick={() => setOpen((v) => !v)}
        {...buttonProps}
      >
        <PlatformIcon platform="qr" size={SIZE_PX[size]} />
        {showLabel && <span>{visibleLabel}</span>}
      </button>
      {open && (
        <Portal>
          <div
            role="presentation"
            style={popoverStyle}
            onClick={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            <div
              ref={popoverRef}
              role="dialog"
              aria-modal="true"
              aria-label="QR code"
              style={cardStyle}
            >
              {loading && (
                <div style={{ width: qrSize, height: qrSize, background: theme.border, opacity: 0.4, borderRadius: theme.radius }} />
              )}
              {error && (
                <div style={{ maxWidth: qrSize, color: '#b91c1c', fontSize: 13 }}>{error.message}</div>
              )}
              {dataUrl && (
                <>
                  <img
                    src={dataUrl}
                    alt="QR code"
                    width={qrSize}
                    height={qrSize}
                    style={{ display: 'block', borderRadius: theme.radius }}
                  />
                  <div style={{ fontSize: 13, color: theme.onSurface, opacity: 0.7, wordBreak: 'break-all', textAlign: 'center', maxWidth: qrSize }}>
                    {resolvedUrl}
                  </div>
                  {!hideDownload && (
                    <a
                      href={dataUrl}
                      download="qr-code.png"
                      style={{
                        fontSize: 13,
                        color: theme.primary,
                        textDecoration: 'underline',
                      }}
                    >
                      Download PNG
                    </a>
                  )}
                </>
              )}
              <button
                type="button"
                style={{
                  marginTop: 4,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: theme.onSurface,
                  opacity: 0.6,
                  fontSize: 13,
                }}
                onClick={() => setOpen(false)}
              >
                {t('button.close')}
              </button>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
