/**
 * Firebase sub-entry — Node-safe (no `'use client'`). Callable from Cloud
 * Functions, Server Components, and the browser.
 *
 *   import { initCaspianShareFirebase, urlHash, CASPIAN_SHARE_FIRESTORE_RULES }
 *     from '@caspian-explorer/script-caspian-share/firebase';
 *
 * React-side hooks (`useShareCount`, `useShareAnalytics`) and components
 * (`<ShareCount>`) live in the main bundle so they participate in
 * `'use client'` semantics.
 */
export { initCaspianShareFirebase, getCaspianShareApp } from './client';
export type {
  CaspianShareFirebase,
  InitCaspianShareFirebaseOptions,
} from './client';
export { COLLECTIONS, getCaspianShareCollections } from './collections';
export type { CaspianShareCollections } from './collections';
export {
  pickShardIndex,
  readSummedShards,
  readMaterializedCount,
  type AggregatedShareCount,
} from './sharded-counter';
export {
  SHARE_COUNT_SHARDS,
  SHORT_LINK_SLUG_LENGTH,
  OG_CACHE_TTL_MS,
  SHARE_EVENT_TTL_MS,
  type ShareCountDoc,
  type ShareCountShard,
  type ShareEventInput,
  type ShareEventDoc,
  type ShareCountsDailyDoc,
  type ShareAnalyticsMode,
  type RecordShareEventsRequest,
  type RecordShareEventsResponse,
  type ShortLinkDoc,
  type CreateShortLinkRequest,
  type CreateShortLinkResponse,
  type OgMetadata,
  type FetchOgMetadataRequest,
  type FetchOgMetadataResponse,
} from './types';
export {
  SHARE_EVENTS_COLLECTION,
  SHARE_COUNTS_DAILY_COLLECTION,
  shareEventsCollection,
  shareCountsDailyCollection,
  shareCountsDailyDoc,
} from './events';
export { ogCacheCollection, ogCacheDoc, readOgCache } from './og-cache';
// NOTE: fetchOgMetadata is intentionally NOT re-exported here because it pulls
// `node:dns/promises` and breaks browser bundlers that import this entry. The
// fetcher lives at `src/firebase/og-fetcher.ts` and is inlined verbatim into
// the deployable Cloud Function at `firebase/functions/src/index.ts`. Clients
// should call the `caspianShareFetchOgMetadata` callable via `useOgMetadata`.
export { urlHash, normalizeUrl } from './url-hash';
export {
  shortLinksCollection,
  shortLinkDoc,
  generateSlug,
  isValidSlug,
  resolveShortLink,
  writeShortLink,
} from './short-links';
export {
  createShortLinkResolverHandler,
  type ShortLinkResolverHandler,
  type ShortLinkResolverOptions,
} from './short-link-resolver';
export {
  CASPIAN_SHARE_FIRESTORE_RULES,
  CASPIAN_SHARE_RULES_FILE,
} from './rules';
export { CASPIAN_SHARE_FIRESTORE_INDEXES } from './indexes';
export { RECORD_SHARE_EVENTS_FUNCTION_SOURCE } from './cloud-function-source';
