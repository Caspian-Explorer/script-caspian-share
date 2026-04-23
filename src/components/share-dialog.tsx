import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Portal } from './portal';
import { ShareButton } from './share-button';
import { CopyLinkButton } from './copy-link-button';
import { LinkPreview } from './link-preview';
import { useShareUrl } from '../hooks/use-share-url';
import { useEscapeKey } from '../hooks/use-escape-key';
import { usePlatformRegistry } from '../provider/platform-registry';
import { useCaspianShareConfig } from '../provider/caspian-share-provider';
import { useCaspianShareFirebase } from '../provider/firebase-provider';
import { useTheme } from '../theme/theme-provider';
import { useT, useDirection } from '../i18n/locale-provider';
import { cn } from '../utils/cn';

export interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url?: string;
  title?: string;
  description?: string;
  /** Restrict to these platform ids. Default: all registered. */
  platforms?: string[];
  /** Show the editable message textarea. Default true. */
  showMessage?: boolean;
  /** Optional content rendered above the platform grid (e.g. <LinkPreview/>). */
  preview?: ReactNode;
  /** Optional content rendered below the copy/qr row. */
  footer?: ReactNode;
  className?: string;
}

export function ShareDialog({
  open,
  onOpenChange,
  url,
  title,
  description,
  platforms,
  showMessage = true,
  preview,
  footer,
  className,
}: ShareDialogProps) {
  const { platforms: registry } = usePlatformRegistry();
  const { defaultTitle, defaultDescription } = useCaspianShareConfig();
  const firebase = useCaspianShareFirebase();
  const theme = useTheme();
  const t = useT();
  const direction = useDirection();
  const resolvedUrl = useShareUrl({ url });
  const [message, setMessage] = useState(title ?? defaultTitle ?? '');
  const dialogRef = useRef<HTMLDivElement>(null);

  useEscapeKey(() => onOpenChange(false), open);

  useEffect(() => {
    if (open) setMessage(title ?? defaultTitle ?? '');
  }, [open, title, defaultTitle]);

  useEffect(() => {
    if (!open || typeof document === 'undefined') return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => {
      const focusable = dialogRef.current?.querySelector<HTMLElement>(
        'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])',
      );
      focusable?.focus();
    }, 0);
    return () => window.clearTimeout(id);
  }, [open]);

  if (!open) return null;

  const list = platforms
    ? platforms
        .map((id) => registry.find((p) => p.id === id))
        .filter((p): p is NonNullable<typeof p> => Boolean(p))
    : registry;

  const backdropStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: theme.backdrop,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    zIndex: 1000,
  };

  const dialogStyle: CSSProperties = {
    background: theme.surface,
    color: theme.onSurface,
    borderRadius: theme.radius * 2,
    boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
    maxWidth: 480,
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    padding: 24,
    direction,
    border: `1px solid ${theme.border}`,
  };

  const headingStyle: CSSProperties = {
    margin: 0,
    fontSize: 18,
    fontWeight: 600,
    color: theme.onSurface,
  };

  const labelStyle: CSSProperties = {
    fontSize: 12,
    fontWeight: 500,
    color: theme.onSurface,
    opacity: 0.7,
    marginBottom: 6,
    display: 'block',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  };

  const textareaStyle: CSSProperties = {
    width: '100%',
    minHeight: 72,
    padding: 10,
    border: `1px solid ${theme.border}`,
    borderRadius: theme.radius,
    background: theme.surface,
    color: theme.onSurface,
    fontFamily: 'inherit',
    fontSize: 14,
    resize: 'vertical',
    boxSizing: 'border-box',
  };

  const urlStyle: CSSProperties = {
    width: '100%',
    padding: 10,
    border: `1px solid ${theme.border}`,
    borderRadius: theme.radius,
    background: theme.surface,
    color: theme.onSurface,
    fontFamily: 'monospace',
    fontSize: 13,
    boxSizing: 'border-box',
  };

  const closeButtonStyle: CSSProperties = {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: theme.onSurface,
    opacity: 0.6,
    padding: 4,
    fontSize: 20,
    lineHeight: 1,
  };

  const ctx = { url, title: showMessage ? message : title, description: description ?? defaultDescription };

  return (
    <Portal>
      <div
        role="presentation"
        style={backdropStyle}
        onClick={(e) => {
          if (e.target === e.currentTarget) onOpenChange(false);
        }}
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={t('dialog.title')}
          className={cn('caspian-share-dialog', className)}
          style={dialogStyle}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={headingStyle}>{t('dialog.title')}</h2>
            <button
              type="button"
              aria-label={t('button.close')}
              style={closeButtonStyle}
              onClick={() => onOpenChange(false)}
            >
              ×
            </button>
          </div>

          {preview !== undefined ? (
            preview && <div style={{ marginBottom: 16 }}>{preview}</div>
          ) : firebase ? (
            <div style={{ marginBottom: 16 }}>
              <LinkPreview url={url} layout="compact" />
            </div>
          ) : null}

          {showMessage && (
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle} htmlFor="caspian-share-message">
                {t('dialog.messageLabel')}
              </label>
              <textarea
                id="caspian-share-message"
                style={textareaStyle}
                placeholder={t('dialog.messagePlaceholder')}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>{t('dialog.platformsHeading')}</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {list.map((p) => (
                <ShareButton
                  key={p.id}
                  platform={p.id}
                  context={ctx}
                  size="md"
                  shape="rounded"
                  showLabel
                />
              ))}
            </div>
          </div>

          <div>
            <label style={labelStyle} htmlFor="caspian-share-url">
              {t('dialog.copyHeading')}
            </label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
              <input
                id="caspian-share-url"
                style={urlStyle}
                readOnly
                value={resolvedUrl}
                onFocus={(e) => e.currentTarget.select()}
              />
              <CopyLinkButton url={url} size="md" shape="rounded" />
            </div>
          </div>

          {footer && <div style={{ marginTop: 16 }}>{footer}</div>}
        </div>
      </div>
    </Portal>
  );
}
