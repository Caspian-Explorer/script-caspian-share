import { forwardRef, type ButtonHTMLAttributes, type CSSProperties } from 'react';
import { useShare, type UseShareInput } from '../hooks/use-share';
import { usePlatform } from '../provider/platform-registry';
import { useTheme } from '../theme/theme-provider';
import { resolvePlatformColor } from '../theme/presets';
import { PlatformIcon } from './platform-icon';
import { cn } from '../utils/cn';

export type ShareButtonSize = 'sm' | 'md' | 'lg';
/** `branded` uses platform color, `monochrome` uses theme.primary, `outlined`/`ghost` are transparent. */
export type ShareButtonVariant = 'branded' | 'monochrome' | 'outlined' | 'ghost';
export type ShareButtonShape = 'square' | 'rounded' | 'circle';

export interface ShareButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'onClick'> {
  /** Platform id from the registry, e.g. `twitter`. */
  platform: string;
  /** Override the share context for this single button. */
  context?: UseShareInput;
  size?: ShareButtonSize;
  /** Defaults to the active theme's variant. */
  variant?: ShareButtonVariant;
  shape?: ShareButtonShape;
  /** Show platform label next to the icon. */
  showLabel?: boolean;
  /** Override the visible label text. */
  label?: string;
}

const SIZE_PX: Record<ShareButtonSize, number> = { sm: 16, md: 20, lg: 24 };
const SIZE_PADDING: Record<ShareButtonSize, string> = {
  sm: '6px 8px',
  md: '8px 12px',
  lg: '10px 16px',
};
const SHAPE_RADIUS: Record<ShareButtonShape, string> = {
  square: '4px',
  rounded: '8px',
  circle: '999px',
};

export const ShareButton = forwardRef<HTMLButtonElement, ShareButtonProps>(function ShareButton(
  {
    platform: platformId,
    context,
    size = 'md',
    variant,
    shape = 'rounded',
    showLabel = false,
    label,
    className,
    style,
    ...buttonProps
  },
  ref,
) {
  const platform = usePlatform(platformId);
  const theme = useTheme();
  const { open } = useShare(context);

  if (!platform) return null;

  const effectiveVariant: ShareButtonVariant = variant ?? theme.variant;
  const brandColor = resolvePlatformColor(theme, platform.id, platform.color);
  const visibleLabel = label ?? platform.label;
  const ariaLabel = buttonProps['aria-label'] ?? `Share on ${platform.label}`;

  const palette: CSSProperties =
    effectiveVariant === 'branded'
      ? { backgroundColor: brandColor, color: '#ffffff', borderColor: brandColor }
      : effectiveVariant === 'monochrome'
        ? { backgroundColor: theme.primary, color: theme.surface, borderColor: theme.primary }
        : effectiveVariant === 'outlined'
          ? { backgroundColor: 'transparent', color: brandColor, borderColor: brandColor }
          : { backgroundColor: 'transparent', color: brandColor, borderColor: 'transparent' };

  const buttonStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    border: '1px solid',
    borderRadius: theme.radius
      ? shape === 'circle'
        ? SHAPE_RADIUS.circle
        : shape === 'square'
          ? SHAPE_RADIUS.square
          : `${theme.radius}px`
      : SHAPE_RADIUS[shape],
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
      aria-label={ariaLabel}
      className={cn('caspian-share-button', `caspian-share-button--${effectiveVariant}`, className)}
      style={buttonStyle}
      onClick={() => open(platformId)}
      {...buttonProps}
    >
      <PlatformIcon platform={platformId} size={SIZE_PX[size]} />
      {showLabel && <span>{visibleLabel}</span>}
    </button>
  );
});
