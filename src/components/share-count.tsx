import type { CSSProperties, ReactNode } from 'react';
import { useShareCount } from '../hooks/use-share-count';
import { useTheme } from '../theme/theme-provider';
import { cn } from '../utils/cn';

export interface ShareCountProps {
  /** URL to read the count for. */
  url: string;
  /** Render content while the count is loading. Default: skeleton bar. */
  loadingFallback?: ReactNode;
  /** Render content when Firebase isn't configured. Default: nothing. */
  disabledFallback?: ReactNode;
  /** Hide the component when count is 0. Default false. */
  hideZero?: boolean;
  /** Format function for the count. Default: `Intl.NumberFormat`. */
  format?: (count: number) => string;
  /** Optional label rendered after the number, e.g. ` shares`. */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * Real-time share count badge backed by the Firestore sharded counter. No-op
 * when Firebase isn't configured.
 */
export function ShareCount({
  url,
  loadingFallback,
  disabledFallback,
  hideZero = false,
  format,
  label,
  className,
  style,
}: ShareCountProps) {
  const { count, loading, enabled } = useShareCount(url);
  const theme = useTheme();

  if (!enabled) return <>{disabledFallback ?? null}</>;
  if (loading) return <>{loadingFallback ?? <ShareCountSkeleton theme={theme} />}</>;
  if (count === null || count === undefined) return null;
  if (hideZero && count === 0) return null;

  const formatter = format ?? defaultFormatter;
  const containerStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 10px',
    border: `1px solid ${theme.border}`,
    borderRadius: theme.radius,
    background: theme.surface,
    color: theme.onSurface,
    fontSize: 14,
    fontWeight: 500,
    fontFamily: 'inherit',
    lineHeight: 1.4,
    ...style,
  };

  return (
    <span className={cn('caspian-share-count', className)} style={containerStyle}>
      <strong style={{ color: theme.primary }}>{formatter(count)}</strong>
      {label && <span style={{ opacity: 0.75 }}>{label}</span>}
    </span>
  );
}

function ShareCountSkeleton({ theme }: { theme: ReturnType<typeof useTheme> }) {
  return (
    <span
      aria-busy="true"
      style={{
        display: 'inline-block',
        width: 56,
        height: 22,
        borderRadius: theme.radius,
        background: theme.border,
        opacity: 0.5,
      }}
    />
  );
}

function defaultFormatter(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`;
  return `${(n / 1_000_000).toFixed(n < 10_000_000 ? 1 : 0)}M`;
}
