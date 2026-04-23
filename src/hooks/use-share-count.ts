import { useEffect, useState } from 'react';
import { onSnapshot } from 'firebase/firestore';
import { useCaspianShareFirebase } from '../provider/firebase-provider';
import { urlHash } from '../firebase/url-hash';
import type { ShareCountDoc } from '../firebase/types';

export interface UseShareCountResult {
  /** Total share count across all platforms. `null` while loading. */
  count: number | null;
  /** Per-platform counts. Empty object when no shares yet. */
  byPlatform: Record<string, number>;
  loading: boolean;
  error: Error | null;
  /** True when Firebase is configured. */
  enabled: boolean;
}

/**
 * Subscribe to the materialized `shareCounts/{urlHash}` document for a URL.
 * Real-time updates via Firestore `onSnapshot`. Returns `count: null` when
 * Firebase isn't configured so consumers can hide the badge cleanly.
 *
 * Pass `null`/`undefined` to disable.
 */
export function useShareCount(url: string | null | undefined): UseShareCountResult {
  const firebase = useCaspianShareFirebase();
  const [count, setCount] = useState<number | null>(null);
  const [byPlatform, setByPlatform] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(Boolean(firebase && url));
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!firebase || !url) {
      setCount(null);
      setByPlatform({});
      setLoading(false);
      return;
    }
    setLoading(true);
    const ref = firebase.collections.shareCountDoc(urlHash(url));
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as ShareCountDoc;
          setCount(data.total ?? 0);
          setByPlatform(data.byPlatform ?? {});
        } else {
          setCount(0);
          setByPlatform({});
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err);
        setLoading(false);
      },
    );
    return unsub;
  }, [firebase, url]);

  return {
    count,
    byPlatform,
    loading,
    error,
    enabled: Boolean(firebase),
  };
}
