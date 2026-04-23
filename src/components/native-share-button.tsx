import { forwardRef, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from 'react';
import { useNativeShare } from '../hooks/use-native-share';
import { useShareUrl } from '../hooks/use-share-url';
import { useCaspianShareConfig } from '../provider/caspian-share-provider';
import { useTheme } from '../theme/theme-provider';
import { useT } from '../i18n/locale-provider';
import { PlatformIcon } from './platform-icon';
import { CopyLinkButton } from './copy-link-button';
import { cn } from '../utils/cn';
import type { ShareButtonShape, ShareButtonSize, ShareButtonVariant } from './share-button';

export interface NativeShareButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'onClick'> {
  url?: string;
  title?: string;
  text?: string;
  size?: ShareButtonSize;
  variant?: ShareButtonVariant;
  shape?: ShareButtonShape;
  showLabel?: boolean;
  label?: string;
  color?: string;
  /**
   * Element rendered when `navigator.share` is unavailable (SSR + browsers
   * without Web Share API). Defaults to `<CopyLinkButton>`.
   */
  fallback?: ReactNode;
}

const SIZE_PX = { sm: 16, md: 20, lg: 24 } as const;
const SIZE_PADDING = { sm: '6px 8px', md: '8px 12px', lg: '10px 16px' } as const;
const SHAPE_RADIUS = { square: '4px', rounded: '8px', circle: '999px' } as const;

export const NativeShareButton = forwardRef<HTMLButtonElement, NativeShareButtonProps>(
  function NativeShareButton(
    {
      url,
      title,
      text,
      size = 'md',
      variant,
      shape = 'rounded',
      showLabel = false,
      label,
      color,
      fallback,
      className,
      style,
      ...buttonProps
    },
    ref,
  ) {
    const { available, share } = useNativeShare();
    const { defaultTitle, defaultDescription } = useCaspianShareConfig();
    const theme = useTheme();
    const t = useT();
    const resolvedUrl = useShareUrl({ url, platformId: 'native-share' });

    const effectiveVariant = variant ?? theme.variant;
    const accent = color ?? theme.primary;
    const visibleLabel = label ?? t('button.share');

    if (!available) {
      // SSR-safe: fallback always renders during SSR + first client paint, then
      // upgrades after useEffect detects navigator.share. No hydration mismatch.
      return (
        <>
          {fallback ?? (
            <CopyLinkButton
              url={url}
              size={size}
              variant={effectiveVariant}
              shape={shape}
              showLabel={showLabel}
              label={visibleLabel}
              color={accent}
            />
          )}
        </>
      );
    }

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
        aria-label={visibleLabel}
        className={cn('caspian-share-button', 'caspian-share-button--native', className)}
        style={buttonStyle}
        onClick={() =>
          share({
            url: resolvedUrl,
            title: title ?? defaultTitle,
            text: text ?? defaultDescription,
          })
        }
        {...buttonProps}
      >
        <PlatformIcon platform="native-share" size={SIZE_PX[size]} />
        {showLabel && <span>{visibleLabel}</span>}
      </button>
    );
  },
);
