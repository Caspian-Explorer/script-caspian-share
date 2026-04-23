import type { ShareEventInput, RecordShareEventsResponse } from '../firebase/types';

export interface ShareEventBatcherOptions {
  /** Flush at most this often (ms). Default 3000. */
  flushMs?: number;
  /** Force-flush when this many events accumulate before flushMs elapses. Default 50. */
  maxBatchSize?: number;
  /** Function called with the accumulated batch — wire to `recordShareEvents` callable. */
  send: (events: ShareEventInput[]) => Promise<RecordShareEventsResponse | void>;
  /** Called when send rejects. */
  onError?: (error: unknown, events: ShareEventInput[]) => void;
}

export interface ShareEventBatcher {
  enqueue(event: ShareEventInput): void;
  flush(): Promise<void>;
  destroy(): void;
}

/**
 * Debounced batcher that accumulates share events and flushes them as a single
 * batched call. Reduces Firestore write QPS for hot URLs.
 *
 * Usage (typically driven by `useShareAnalytics`):
 *   const batcher = createShareEventBatcher({ send: recordShareEvents });
 *   batcher.enqueue({ url, platformId });
 */
export function createShareEventBatcher({
  flushMs = 3000,
  maxBatchSize = 50,
  send,
  onError,
}: ShareEventBatcherOptions): ShareEventBatcher {
  let queue: ShareEventInput[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;
  let destroyed = false;

  const doFlush = async () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (queue.length === 0) return;
    const batch = queue;
    queue = [];
    try {
      await send(batch);
    } catch (e) {
      onError?.(e, batch);
    }
  };

  return {
    enqueue(event) {
      if (destroyed) return;
      queue.push(event);
      if (queue.length >= maxBatchSize) {
        // Synchronous fire-and-forget — don't await; caller already returned.
        void doFlush();
        return;
      }
      if (!timer) {
        timer = setTimeout(() => {
          void doFlush();
        }, flushMs);
      }
    },
    flush: doFlush,
    destroy() {
      destroyed = true;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      queue = [];
    },
  };
}
