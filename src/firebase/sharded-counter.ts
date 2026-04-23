import { getDocs, getDoc } from 'firebase/firestore';
import { SHARE_COUNT_SHARDS, type ShareCountDoc, type ShareCountShard } from './types';
import type { CaspianShareCollections } from './collections';

/** Pick a shard at random — used by writes to spread contention. */
export function pickShardIndex(): number {
  return Math.floor(Math.random() * SHARE_COUNT_SHARDS);
}

export interface AggregatedShareCount {
  total: number;
  byPlatform: Record<string, number>;
}

/**
 * Read all shards for a URL hash and sum into a single aggregate. Use this on
 * the client when the materialized `shareCounts/{urlHash}` doc may be stale or
 * missing.
 *
 * Cost: 1 read per shard (default 10) per call. For real-time counts, prefer
 * subscribing to the materialized doc instead — it's updated by the trigger.
 */
export async function readSummedShards(
  collections: CaspianShareCollections,
  urlHashId: string,
): Promise<AggregatedShareCount> {
  const snap = await getDocs(collections.shardsCollection(urlHashId));
  let total = 0;
  const byPlatform: Record<string, number> = {};
  snap.forEach((doc) => {
    const data = doc.data() as ShareCountShard | undefined;
    if (!data) return;
    total += data.count ?? 0;
    if (data.byPlatform) {
      for (const [platform, n] of Object.entries(data.byPlatform)) {
        byPlatform[platform] = (byPlatform[platform] ?? 0) + (n ?? 0);
      }
    }
  });
  return { total, byPlatform };
}

/**
 * Read the materialized `shareCounts/{urlHash}` document. Returns null if no
 * shares have been recorded yet (the doc may not exist before the trigger
 * runs).
 */
export async function readMaterializedCount(
  collections: CaspianShareCollections,
  urlHashId: string,
): Promise<ShareCountDoc | null> {
  const snap = await getDoc(collections.shareCountDoc(urlHashId));
  return snap.exists() ? (snap.data() as ShareCountDoc) : null;
}
