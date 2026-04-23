import { useCallback, useEffect, useState } from 'react';

export interface NativeShareData {
  url?: string;
  title?: string;
  text?: string;
  files?: File[];
}

export interface UseNativeShareResult {
  /** True after first paint when `navigator.share` is available. SSR-safe. */
  available: boolean;
  /** True after first paint when `navigator.canShare(data)` returns true. */
  canShare: (data?: NativeShareData) => boolean;
  /** Invoke the OS share sheet. Resolves false on user cancel. */
  share: (data: NativeShareData) => Promise<boolean>;
  error: Error | null;
}

/**
 * SSR-safe Web Share API wrapper. `available` is always `false` during SSR and
 * the first client render so consumers can render a fallback without hydration
 * mismatch, then upgrade after `useEffect` runs.
 */
export function useNativeShare(): UseNativeShareResult {
  const [available, setAvailable] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setAvailable(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
  }, []);

  const canShare = useCallback(
    (data?: NativeShareData) => {
      if (!available || typeof navigator === 'undefined') return false;
      if (typeof navigator.canShare !== 'function') return true;
      try {
        return navigator.canShare(data as ShareData);
      } catch {
        return false;
      }
    },
    [available],
  );

  const share = useCallback(
    async (data: NativeShareData) => {
      setError(null);
      if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
        setError(new Error('Web Share API not available'));
        return false;
      }
      try {
        await navigator.share(data as ShareData);
        return true;
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') {
          return false;
        }
        setError(e instanceof Error ? e : new Error(String(e)));
        return false;
      }
    },
    [],
  );

  return { available, canShare, share, error };
}
