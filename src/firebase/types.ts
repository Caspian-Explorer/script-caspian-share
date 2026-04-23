/**
 * The number of shards used per `shareCounts` document. 10 is the recommended
 * starting point for the distributed-counter pattern; raise to 50–100 if a
 * single URL receives sustained shares > 10/sec.
 */
export const SHARE_COUNT_SHARDS = 10;

/**
 * Aggregate share count document, materialized by the Cloud Function trigger.
 * Stored at `shareCounts/{urlHash}`. Per-shard counts live in the subcollection
 * `shareCounts/{urlHash}/shards/{0..N-1}`.
 */
export interface ShareCountDoc {
  url: string;
  total: number;
  byPlatform: Record<string, number>;
  updatedAt: number;
}

/** Per-shard document at `shareCounts/{urlHash}/shards/{shardIndex}`. */
export interface ShareCountShard {
  count: number;
  byPlatform: Record<string, number>;
}

/**
 * One share event, batched and submitted by the client to the
 * `recordShareEvents` callable. The callable validates and increments shards.
 */
export interface ShareEventInput {
  url: string;
  platformId: string;
  /** Client timestamp (ms). Server may override with serverTimestamp() if needed. */
  ts?: number;
  /** Optional referrer URL. */
  referrer?: string;
}

export interface RecordShareEventsRequest {
  events: ShareEventInput[];
  /**
   * Persist each event to `shareEvents/{id}` in addition to incrementing the
   * sharded counter. Default false (counter-only). Driven by
   * `analytics: 'detailed'` on the provider.
   */
  detailed?: boolean;
}

export interface RecordShareEventsResponse {
  accepted: number;
  rejected: number;
}

/**
 * Short link document at `shortLinks/{slug}`. Created by the
 * `caspianShareCreateShortLink` callable; resolved by the
 * `caspianShareResolveShortLink` HTTP function (Firebase Hosting rewrite) or
 * the `createShortLinkResolverHandler` factory (Next.js / Vercel / Edge).
 */
export interface ShortLinkDoc {
  slug: string;
  url: string;
  createdAt: number;
  /** UID of the creator (if authenticated). */
  createdBy?: string;
  /** Epoch ms after which the resolver should 410 Gone. */
  expiresAt?: number;
  /** Total resolution hits (best-effort, incremented by the resolver). */
  hits?: number;
}

export interface CreateShortLinkRequest {
  url: string;
  /** Optional custom slug. Server may reject if taken or invalid. */
  slug?: string;
  /** Epoch ms after which the link should expire. */
  expiresAt?: number;
}

export interface CreateShortLinkResponse {
  slug: string;
  url: string;
  /** Fully-qualified short URL when the server knows the host. */
  shortUrl?: string;
}

/** Default slug length when the server generates one. 7 base62 chars = 3.5T values. */
export const SHORT_LINK_SLUG_LENGTH = 7;

/**
 * Cached Open Graph / Twitter Card metadata for a URL. Stored at
 * `ogCache/{urlHash}`, populated by the `caspianShareFetchOgMetadata` callable.
 */
export interface OgMetadata {
  /** Original (un-normalized) request URL — preserves query params like ?id=. */
  url: string;
  title?: string;
  description?: string;
  image?: string;
  imageAlt?: string;
  siteName?: string;
  type?: string;
  locale?: string;
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
  twitterCreator?: string;
  /** Final URL after redirects. */
  resolvedUrl?: string;
  /** Epoch ms — used to determine if the cache entry is stale. */
  fetchedAt: number;
}

export interface FetchOgMetadataRequest {
  url: string;
  /** Bypass cache and force a re-fetch. Default false. */
  force?: boolean;
}

export type FetchOgMetadataResponse = OgMetadata;

/** Cache TTL (24 h). Older entries are re-fetched on read. */
export const OG_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Analytics mode: `counter` writes only the sharded counter (cheapest, no
 * per-event log). `detailed` ALSO writes each event to `shareEvents/{id}` so
 * you can query the stream and run BigQuery aggregations. Default `counter`.
 */
export type ShareAnalyticsMode = 'counter' | 'detailed';

/**
 * Persisted share-event document at `shareEvents/{id}`. Only written when the
 * provider is configured with `analytics: 'detailed'`. Set a Firestore TTL
 * policy on `expiresAt` to auto-prune old events (recommended: 90 days).
 */
export interface ShareEventDoc {
  /** Original (un-normalized) URL. */
  url: string;
  /** Normalized URL — same hash key used by `shareCounts`. */
  normalizedUrl: string;
  /** Same hash used as ID in `shareCounts/{urlHash}`. */
  urlHash: string;
  platformId: string;
  /** Server timestamp (ms). */
  ts: number;
  /** Auth UID if authenticated. */
  uid?: string;
  /** Referrer URL (from client). */
  referrer?: string;
  /** Date string YYYYMMDD — denormalized for cheap day-bucketed queries. */
  yyyymmdd: string;
  /** Epoch ms after which TTL policy will delete this doc. */
  expiresAt: number;
}

/**
 * Daily roll-up document at `shareCountsDaily/{yyyymmdd}_{urlHash}`. Updated
 * by the `caspianShareDailyRollup` trigger. Read these for BigQuery-style
 * "shares per day per URL" charts without scanning the full event stream.
 */
export interface ShareCountsDailyDoc {
  yyyymmdd: string;
  urlHash: string;
  url: string;
  total: number;
  byPlatform: Record<string, number>;
  updatedAt: number;
}

/** Default Firestore TTL for shareEvents (90 days). Configure in console too. */
export const SHARE_EVENT_TTL_MS = 90 * 24 * 60 * 60 * 1000;
