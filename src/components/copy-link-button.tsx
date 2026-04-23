import { forwardRef, type ButtonHTMLAttributes, type CSSProperties } from 'react';
import { useClipboard } from '../hooks/use-clipboard';
import { useShareUrl } from '../hooks/use-share-url';
import { useTheme } from '../theme/theme-provider';
import { useT } from '../i18n/locale-provider';
import { PlatformIcon } from './platform-icon';
import { cn } from '../utils/cn';
import type { ShareButtonShape, ShareButtonSize, ShareButtonVariant } from './share-button';

export interface CopyLinkButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'onClick'> {
  url?: string;
  size?: ShareButtonSize;
  variant?: ShareButtonVariant;
  shape?: ShareButtonShape;
  showLabel?: boolean;
  label?: string;
  copiedLabel?: string;
  /** Brand accent color for branded variant. Default neutral grey. */
  color?: string;
}

const SIZE_PX = { sm: 16, md: 20, lg: 24 } as const;
const SIZE_PADDING = { sm: '6px 8px', md: '8px 12px', lg: '10px 16px' } as const;
const SHAPE_RADIUS = { square: '4px', rounded: '8px', circle: '999px' } as const;

export const CopyLinkButton = forwardRef<HTMLButtonElement, CopyLinkButtonProps>(
  function CopyLinkButton(
    {
      url,
      size = 'md',
      variant,
      shape = 'rounded',
      showLabel = false,
      label,
      copiedLabel,
      color,
      className,
      style,
      ...buttonProps
    },
    ref,
  ) {
    const resolvedUrl = useShareUrl({ url, platformId: 'copy-link' });
    const { copy, copied } = useClipboard();
    const theme = useTheme();
    const t = useT();

    const effectiveVariant = variant ?? theme.variant;
    const accent = color ?? theme.primary;
    const visibleLabel = label ?? t('button.copyLink');
    const visibleCopiedLabel = copiedLabel ?? t('button.copied');

    const palette: CSSProperties =
      effectiveVariant === 'branded'
        ? { backgroundColor: accent, color: theme.surface, borderColor: accent }
        : effectiveVariant === 'monochrome'
          ? { backgroundColor: theme.primary, color: theme.surface, borderColor: theme.primary }
          : effectiveVariant === 'outlined'
            ? { backgroundColor: 'transparent', color: accent, borderColor: accent }
            : { backgroundColor: 'transparent', color: accent, borderColor: 'transparent' };

    const buttonStyle: CSSProperties = {
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
      transition: 'opacity .15s ease',
      ...palette,
      ...style,
    };

    return (
      <button
        ref={ref}
        type="button"
        aria-label={copied ? visibleCopiedLabel : visibleLabel}
        className={cn('caspian-share-button', 'caspian-share-button--copy-link', className)}
        style={buttonStyle}
        onClick={() => copy(resolvedUrl)}
        {...buttonProps}
      >
        <PlatformIcon platform="copy-link" size={SIZE_PX[size]} />
        {showLabel && <span>{copied ? visibleCopiedLabel : visibleLabel}</span>}
      </button>
    );
  },
);
