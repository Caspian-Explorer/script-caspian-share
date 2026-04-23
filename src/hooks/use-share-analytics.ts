import { useEffect, useMemo, useRef } from 'react';
import { useCaspianShareFirebase } from '../provider/firebase-provider';
import { useCaspianShareConfig } from '../provider/caspian-share-provider';
import { createShareEventBatcher, type ShareEventBatcher } from '../services/share-event-service';
import type { ShareEventInput } from '../firebase/types';

export interface UseShareAnalyticsResult {
  /**
   * Record a share event. Events are debounced and flushed in batches to
   * `caspianShareRecordEvents`. No-op when Firebase isn't configured.
   */
  record: (event: ShareEventInput) => void;
  /** Force-flush queued events immediately (e.g. on page unload). */
  flush: () => Promise<void>;
  /** True when Firebase is wired up and events will actually be sent. */
  enabled: boolean;
}

export interface UseShareAnalyticsOptions {
  flushMs?: number;
  maxBatchSize?: number;
  onError?: (error: unknown) => void;
}

/**
 * Wire share events to the Firebase Cloud Function callable. Without
 * `firebaseConfig` on `<CaspianShareProvider>`, this hook returns a no-op
 * `record` function so callers can be Firebase-agnostic.
 */
export function useShareAnalytics(options: UseShareAnalyticsOptions = {}): UseShareAnalyticsResult {
  const firebase = useCaspianShareFirebase();
  const { analytics } = useCaspianShareConfig();
  const detailed = analytics === 'detailed';
  const enabled = Boolean(firebase);
  const batcherRef = useRef<ShareEventBatcher | null>(null);

  const batcher = useMemo<ShareEventBatcher | null>(() => {
    if (!firebase) return null;
    const b = createShareEventBatcher({
      flushMs: options.flushMs,
      maxBatchSize: options.maxBatchSize,
      send: async (events) => {
        const result = await firebase.callables.recordShareEvents({ events, detailed });
        return result.data;
      },
      onError: (e) => options.onError?.(e),
    });
    batcherRef.current = b;
    return b;
  }, [firebase, detailed, options.flushMs, options.maxBatchSize, options.onError]);

  useEffect(() => {
    return () => {
      batcherRef.current?.destroy();
      batcherRef.current = null;
    };
  }, [batcher]);

  // Flush pending batch when the page is hidden — best-effort.
  useEffect(() => {
    if (!batcher || typeof document === 'undefined') return;
    const onHide = () => {
      void batcher.flush();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
    };
  }, [batcher]);

  return {
    enabled,
    record: (event) => batcher?.enqueue(event),
    flush: async () => {
      if (batcher) await batcher.flush();
    },
  };
}
