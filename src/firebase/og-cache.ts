import {
  collection,
  doc,
  getDoc,
  type CollectionReference,
  type DocumentReference,
  type Firestore,
} from 'firebase/firestore';
import { OG_CACHE_TTL_MS, type OgMetadata } from './types';
import { urlHash } from './url-hash';

const OG_CACHE_COLLECTION = 'ogCache';

export function ogCacheCollection(db: Firestore): CollectionReference<OgMetadata> {
  return collection(db, OG_CACHE_COLLECTION) as CollectionReference<OgMetadata>;
}

export function ogCacheDoc(db: Firestore, urlHashId: string): DocumentReference<OgMetadata> {
  return doc(db, OG_CACHE_COLLECTION, urlHashId) as DocumentReference<OgMetadata>;
}

/** Returns the cached metadata for a URL if present and not stale, else null. */
export async function readOgCache(db: Firestore, url: string): Promise<OgMetadata | null> {
  const snap = await getDoc(ogCacheDoc(db, urlHash(url)));
  if (!snap.exists()) return null;
  const data = snap.data() as OgMetadata;
  if (Date.now() - data.fetchedAt > OG_CACHE_TTL_MS) return null;
  return data;
}
