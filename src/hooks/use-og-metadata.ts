import { useEffect, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { useCaspianShareFirebase } from '../provider/firebase-provider';
import { readOgCache } from '../firebase/og-cache';
import type {
  FetchOgMetadataRequest,
  FetchOgMetadataResponse,
  OgMetadata,
} from '../firebase/types';

export interface UseOgMetadataOptions {
  /** Skip the Firestore read and always call the Cloud Function. Default false. */
  skipCache?: boolean;
  /** Bypass server-side cache too. Default false. */
  force?: boolean;
}

export interface UseOgMetadataResult {
  data: OgMetadata | null;
  loading: boolean;
  error: Error | null;
  /** True when Firebase is configured. */
  enabled: boolean;
  /** Force a re-fetch. */
  refetch: () => Promise<void>;
}

const inflight = new Map<string, Promise<OgMetadata>>();

/**
 * Fetch Open Graph metadata for a URL with two layers of caching:
 *   1. Client-side Firestore read (`ogCache/{urlHash}`) for warm cache hits
 *   2. Server callable that fetches + caches if missing or expired
 *
 * Returns `data: null` when Firebase is not configured.
 */
export function useOgMetadata(
  url: string | null | undefined,
  options: UseOgMetadataOptions = {},
): UseOgMetadataResult {
  const firebase = useCaspianShareFirebase();
  const [data, setData] = useState<OgMetadata | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(firebase && url));
  const [error, setError] = useState<Error | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (!firebase || !url) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    (async () => {
      try {
        // 1. Try client-side cache.
        if (!options.skipCache && !options.force) {
          const cached = await readOgCache(firebase.db, url);
          if (cancelled) return;
          if (cached) {
            setData(cached);
            setLoading(false);
            return;
          }
        }
        // 2. De-dupe inflight server requests for the same URL.
        const cacheKey = `${url}|${options.force ? 'force' : 'cache'}`;
        let promise = inflight.get(cacheKey);
        if (!promise) {
          const callable = httpsCallable<FetchOgMetadataRequest, FetchOgMetadataResponse>(
            firebase.functions,
            'caspianShareFetchOgMetadata',
          );
          promise = callable({ url, force: options.force }).then((r) => r.data);
          inflight.set(cacheKey, promise);
          promise.finally(() => inflight.delete(cacheKey));
        }
        const result = await promise;
        if (cancelled) return;
        setData(result);
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e : new Error(String(e)));
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [firebase, url, options.skipCache, options.force, reloadKey]);

  return {
    data,
    loading,
    error,
    enabled: Boolean(firebase),
    refetch: async () => {
      setReloadKey((k) => k + 1);
    },
  };
}
