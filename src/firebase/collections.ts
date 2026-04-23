import {
  collection,
  doc,
  type CollectionReference,
  type DocumentReference,
  type Firestore,
} from 'firebase/firestore';
import type { ShareCountDoc, ShareCountShard } from './types';

/**
 * Collection paths used by Caspian Share. Stable across versions; safe to
 * reference from Cloud Functions and security rules.
 */
export const COLLECTIONS = {
  shareCounts: 'shareCounts',
  shards: 'shards',
} as const;

export interface CaspianShareCollections {
  /** `shareCounts` collection. Document IDs are `urlHash(url)` outputs. */
  shareCounts: CollectionReference<ShareCountDoc>;
  /** Get a single share-count doc ref. */
  shareCountDoc: (urlHashId: string) => DocumentReference<ShareCountDoc>;
  /** Subcollection ref for the per-URL shard documents. */
  shardsCollection: (urlHashId: string) => CollectionReference<ShareCountShard>;
  /** Single shard doc ref (`shareCounts/{hash}/shards/{shardIndex}`). */
  shardDoc: (urlHashId: string, shardIndex: number) => DocumentReference<ShareCountShard>;
}

export function getCaspianShareCollections(db: Firestore): CaspianShareCollections {
  const shareCounts = collection(db, COLLECTIONS.shareCounts) as CollectionReference<ShareCountDoc>;
  return {
    shareCounts,
    shareCountDoc: (id) => doc(shareCounts, id),
    shardsCollection: (id) =>
      collection(db, COLLECTIONS.shareCounts, id, COLLECTIONS.shards) as CollectionReference<ShareCountShard>,
    shardDoc: (id, shardIndex) =>
      doc(db, COLLECTIONS.shareCounts, id, COLLECTIONS.shards, String(shardIndex)) as DocumentReference<ShareCountShard>,
  };
}
