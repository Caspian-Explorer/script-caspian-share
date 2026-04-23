import type { CSSProperties, ReactNode } from 'react';
import { useShareEvents, type UseShareEventsOptions } from '../hooks/use-share-events';
import { usePlatform } from '../provider/platform-registry';
import { useTheme } from '../theme/theme-provider';
import { PlatformIcon } from './platform-icon';
import { cn } from '../utils/cn';

export interface ShareEventStreamProps extends UseShareEventsOptions {
  /** URL to stream events for. */
  url: string;
  /** Custom date formatter. Default: `Intl.DateTimeFormat`. */
  formatTime?: (ts: number) => string;
  /** Render content while events load. Default: skeleton rows. */
  loadingFallback?: ReactNode;
  /** Render when feature disabled (no Firebase / not detailed mode). */
  disabledFallback?: ReactNode;
  /** Render when no events yet. */
  emptyFallback?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * Live list of recent share events for a URL — useful for admin dashboards or
 * "shared by" widgets. Requires `analytics: 'detailed'` on the provider AND
 * the user be signed in (Firestore rule).
 */
export function ShareEventStream({
  url,
  platformId,
  limit = 25,
  formatTime,
  loadingFallback,
  disabledFallback,
  emptyFallback,
  className,
  style,
}: ShareEventStreamProps) {
  const { events, loading, error, enabled } = useShareEvents(url, { platformId, limit });
  const theme = useTheme();
  const fmt = formatTime ?? defaultFormatTime;

  if (!enabled) return <>{disabledFallback ?? null}</>;
  if (error) return <>{disabledFallback ?? null}</>;
  if (loading) return <>{loadingFallback ?? <Skeleton theme={theme} />}</>;
  if (events.length === 0) return <>{emptyFallback ?? null}</>;

  const containerStyle: CSSProperties = {
    border: `1px solid ${theme.border}`,
    borderRadius: theme.radius,
    background: theme.surface,
    overflow: 'hidden',
    ...style,
  };

  return (
    <ul
      className={cn('caspian-share-event-stream', className)}
      style={{ ...containerStyle, listStyle: 'none', margin: 0, padding: 0 }}
    >
      {events.map((ev, i) => (
        <EventRow
          key={`${ev.ts}-${i}`}
          platformId={ev.platformId}
          ts={ev.ts}
          theme={theme}
          isLast={i === events.length - 1}
          formatTime={fmt}
        />
      ))}
    </ul>
  );
}

function EventRow({
  platformId,
  ts,
  theme,
  isLast,
  formatTime,
}: {
  platformId: string;
  ts: number;
  theme: ReturnType<typeof useTheme>;
  isLast: boolean;
  formatTime: (ts: number) => string;
}) {
  const platform = usePlatform(platformId);
  const accent = platform?.color ?? theme.primary;
  return (
    <li
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 12px',
        borderBottom: isLast ? 'none' : `1px solid ${theme.border}`,
        fontSize: 13,
        color: theme.onSurface,
      }}
    >
      <span
        style={{
          color: accent,
          width: 18,
          height: 18,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <PlatformIcon platform={platformId} size={18} />
      </span>
      <span style={{ flex: 1, fontWeight: 500 }}>{platform?.label ?? platformId}</span>
      <span style={{ opacity: 0.6, fontVariantNumeric: 'tabular-nums' }}>{formatTime(ts)}</span>
    </li>
  );
}

function Skeleton({ theme }: { theme: ReturnType<typeof useTheme> }) {
  return (
    <div
      aria-busy="true"
      style={{
        border: `1px solid ${theme.border}`,
        borderRadius: theme.radius,
        background: theme.surface,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            gap: 12,
            opacity: 1 - i * 0.25,
          }}
        >
          <div style={{ width: 18, height: 18, borderRadius: 4, background: theme.border }} />
          <div style={{ flex: 1, height: 12, borderRadius: 4, background: theme.border }} />
          <div style={{ width: 64, height: 12, borderRadius: 4, background: theme.border }} />
        </div>
      ))}
    </div>
  );
}

function defaultFormatTime(ts: number): string {
  const diffMs = Date.now() - ts;
  if (diffMs < 60_000) return 'just now';
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}m ago`;
  if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)}h ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
