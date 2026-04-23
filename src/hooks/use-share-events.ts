import { useEffect, useState } from 'react';
import { onSnapshot, query, where, orderBy, limit as fsLimit } from 'firebase/firestore';
import { useCaspianShareFirebase } from '../provider/firebase-provider';
import { shareEventsCollection, shareCountsDailyCollection } from '../firebase/events';
import { urlHash } from '../firebase/url-hash';
import type { ShareEventDoc, ShareCountsDailyDoc } from '../firebase/types';

export interface UseShareEventsOptions {
  /** Filter to a single platform. */
  platformId?: string;
  /** Max events returned. Default 50. */
  limit?: number;
}

export interface UseShareEventsResult {
  events: ShareEventDoc[];
  loading: boolean;
  error: Error | null;
  /** True when Firebase is configured AND analytics mode is `detailed`. */
  enabled: boolean;
}

/**
 * Subscribe to recent share events for a URL. Requires `analytics: 'detailed'`
 * on the provider AND the user be signed in (Firestore rule).
 *
 * Returns `events: []` and `enabled: false` when Firebase isn't configured.
 */
export function useShareEvents(
  url: string | null | undefined,
  { platformId, limit = 50 }: UseShareEventsOptions = {},
): UseShareEventsResult {
  const firebase = useCaspianShareFirebase();
  const [events, setEvents] = useState<ShareEventDoc[]>([]);
  const [loading, setLoading] = useState<boolean>(Boolean(firebase && url));
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!firebase || !url) {
      setEvents([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const id = urlHash(url);
    const constraints = platformId
      ? [where('urlHash', '==', id), where('platformId', '==', platformId), orderBy('ts', 'desc'), fsLimit(limit)]
      : [where('urlHash', '==', id), orderBy('ts', 'desc'), fsLimit(limit)];
    const q = query(shareEventsCollection(firebase.db), ...constraints);
    const unsub = onSnapshot(
      q,
      (snap) => {
        setEvents(snap.docs.map((d) => d.data() as ShareEventDoc));
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err);
        setLoading(false);
      },
    );
    return unsub;
  }, [firebase, url, platformId, limit]);

  return { events, loading, error, enabled: Boolean(firebase) };
}

export interface UseShareCountsDailyResult {
  days: ShareCountsDailyDoc[];
  loading: boolean;
  error: Error | null;
  enabled: boolean;
}

/**
 * Subscribe to per-day rollups for a URL — useful for charting share velocity.
 * Returns the most recent `limit` days (default 30) in descending order.
 */
export function useShareCountsDaily(
  url: string | null | undefined,
  { limit = 30 }: { limit?: number } = {},
): UseShareCountsDailyResult {
  const firebase = useCaspianShareFirebase();
  const [days, setDays] = useState<ShareCountsDailyDoc[]>([]);
  const [loading, setLoading] = useState<boolean>(Boolean(firebase && url));
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!firebase || !url) {
      setDays([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const id = urlHash(url);
    const q = query(
      shareCountsDailyCollection(firebase.db),
      where('urlHash', '==', id),
      orderBy('yyyymmdd', 'desc'),
      fsLimit(limit),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setDays(snap.docs.map((d) => d.data() as ShareCountsDailyDoc));
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err);
        setLoading(false);
      },
    );
    return unsub;
  }, [firebase, url, limit]);

  return { days, loading, error, enabled: Boolean(firebase) };
}
