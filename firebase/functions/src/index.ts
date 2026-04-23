/**
 * Caspian Share Cloud Functions.
 *
 *   - `caspianShareRecordEvents`     — callable: batched share-event ingest →
 *                                       sharded counter + materialized aggregate
 *   - `caspianShareCreateShortLink`  — callable: create shortLinks/{slug}
 *   - `caspianShareResolveShortLink` — HTTP: redirect /s/{slug} → target URL
 *                                       (use as Firebase Hosting rewrite)
 *
 * Deploy:
 *   cd firebase/functions
 *   npm install
 *   npm run deploy
 *
 * Or copy this file into your existing `functions/src/index.ts`.
 */
import { onCall, onRequest, HttpsError, type CallableRequest, type Request } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import type { Response } from 'express';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';

if (!getApps().length) initializeApp();
const db = getFirestore();

const SHARDS = 10;
const MAX_EVENTS_PER_CALL = 50;
const MAX_URL_LEN = 2048;
const RATE_LIMIT_PER_MIN = 30;
const SHARE_EVENT_TTL_MS = 90 * 24 * 60 * 60 * 1000;

function yyyymmdd(ts: number): string {
  const d = new Date(ts);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

interface ShareEventInput {
  url: string;
  platformId: string;
  ts?: number;
  referrer?: string;
}

interface RecordShareEventsRequest {
  events: ShareEventInput[];
  detailed?: boolean;
}

interface RecordShareEventsResponse {
  accepted: number;
  rejected: number;
}

const STRIPPED_PARAMS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id',
  'fbclid', 'gclid', 'mc_cid', 'mc_eid', 'ref',
]);

function normalizeUrl(url: string): string {
  let parsed: URL;
  try { parsed = new URL(url, 'https://placeholder.invalid'); } catch { return url; }
  parsed.hash = '';
  parsed.protocol = parsed.protocol.toLowerCase();
  parsed.hostname = parsed.hostname.toLowerCase();
  if ((parsed.protocol === 'http:' && parsed.port === '80') ||
      (parsed.protocol === 'https:' && parsed.port === '443')) parsed.port = '';
  if (parsed.pathname === '/') parsed.pathname = '';
  const filtered: [string, string][] = [];
  for (const [k, v] of parsed.searchParams.entries()) {
    if (!STRIPPED_PARAMS.has(k.toLowerCase())) filtered.push([k, v]);
  }
  filtered.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  parsed.search = '';
  for (const [k, v] of filtered) parsed.searchParams.append(k, v);
  if (parsed.host === 'placeholder.invalid') return parsed.pathname + parsed.search;
  return parsed.toString();
}

function cyrb53(str: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const high = (h2 >>> 0).toString(16).padStart(8, '0').slice(0, 6);
  const low = (h1 >>> 0).toString(16).padStart(8, '0');
  return high + low;
}

const rateState = new Map<string, { minute: number; count: number }>();

export const caspianShareRecordEvents = onCall<
  RecordShareEventsRequest,
  Promise<RecordShareEventsResponse>
>(
  { region: 'us-central1', cors: true, maxInstances: 5 },
  async (req: CallableRequest<RecordShareEventsRequest>) => {
    const events = Array.isArray(req.data?.events) ? req.data.events : [];
    if (events.length === 0) return { accepted: 0, rejected: 0 };
    if (events.length > MAX_EVENTS_PER_CALL) {
      throw new HttpsError('invalid-argument', 'Too many events per call');
    }

    const key = req.auth?.uid ?? req.rawRequest?.ip ?? 'anon';
    const now = Date.now();
    const minute = Math.floor(now / 60_000);
    const tracked = rateState.get(key);
    if (tracked && tracked.minute === minute) {
      if (tracked.count + events.length > RATE_LIMIT_PER_MIN) {
        throw new HttpsError('resource-exhausted', 'Rate limit exceeded');
      }
      tracked.count += events.length;
    } else {
      rateState.set(key, { minute, count: events.length });
    }

    const detailed = req.data?.detailed === true;
    const uid = req.auth?.uid;

    let accepted = 0;
    let rejected = 0;
    const batch = db.batch();

    for (const ev of events) {
      if (
        typeof ev?.url !== 'string' ||
        ev.url.length === 0 ||
        ev.url.length > MAX_URL_LEN ||
        typeof ev?.platformId !== 'string' ||
        ev.platformId.length === 0
      ) {
        rejected += 1;
        continue;
      }
      const normalized = normalizeUrl(ev.url);
      const id = cyrb53(normalized);
      const ts = typeof ev.ts === 'number' ? ev.ts : Date.now();
      const shardIndex = Math.floor(Math.random() * SHARDS);
      const shardRef = db.collection('shareCounts').doc(id).collection('shards').doc(String(shardIndex));
      batch.set(
        shardRef,
        {
          count: FieldValue.increment(1),
          byPlatform: { [ev.platformId]: FieldValue.increment(1) },
        },
        { merge: true },
      );
      const aggRef = db.collection('shareCounts').doc(id);
      batch.set(
        aggRef,
        {
          url: normalized,
          total: FieldValue.increment(1),
          byPlatform: { [ev.platformId]: FieldValue.increment(1) },
          updatedAt: Date.now(),
        },
        { merge: true },
      );

      if (detailed) {
        const eventRef = db.collection('shareEvents').doc();
        batch.set(eventRef, {
          url: ev.url,
          normalizedUrl: normalized,
          urlHash: id,
          platformId: ev.platformId,
          ts,
          uid: uid ?? null,
          referrer: typeof ev.referrer === 'string' ? ev.referrer.slice(0, 1024) : null,
          yyyymmdd: yyyymmdd(ts),
          // expiresAt drives the Firestore TTL policy. Set the policy on the
          // shareEvents collection in the Firebase console; field name `expiresAt`.
          expiresAt: Timestamp.fromMillis(ts + SHARE_EVENT_TTL_MS),
        });
      }
      accepted += 1;
    }

    await batch.commit();
    return { accepted, rejected };
  },
);

// ─── Short links ─────────────────────────────────────────────────────────────

const BASE62 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const SLUG_PATTERN = /^[A-Za-z0-9_-]{3,32}$/;
const SHORT_LINK_SLUG_LENGTH = 7;
const MAX_SLUG_GENERATION_RETRIES = 5;

function genSlug(len: number = SHORT_LINK_SLUG_LENGTH): string {
  let out = '';
  for (let i = 0; i < len; i++) out += BASE62[Math.floor(Math.random() * BASE62.length)];
  return out;
}

interface CreateShortLinkRequest {
  url: string;
  slug?: string;
  expiresAt?: number;
}

interface CreateShortLinkResponse {
  slug: string;
  url: string;
}

export const caspianShareCreateShortLink = onCall<
  CreateShortLinkRequest,
  Promise<CreateShortLinkResponse>
>(
  { region: 'us-central1', cors: true, maxInstances: 5 },
  async (req: CallableRequest<CreateShortLinkRequest>) => {
    if (!req.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Sign-in required to create short links');
    }
    const { url, slug: requestedSlug, expiresAt } = req.data ?? ({} as CreateShortLinkRequest);
    if (typeof url !== 'string' || url.length === 0 || url.length > MAX_URL_LEN) {
      throw new HttpsError('invalid-argument', 'Invalid URL');
    }
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        throw new Error('disallowed scheme');
      }
    } catch {
      throw new HttpsError('invalid-argument', 'URL must be a valid http(s) URL');
    }
    if (requestedSlug !== undefined && !SLUG_PATTERN.test(requestedSlug)) {
      throw new HttpsError('invalid-argument', 'Invalid slug');
    }

    let slug = requestedSlug;
    if (slug) {
      const existing = await db.collection('shortLinks').doc(slug).get();
      if (existing.exists) throw new HttpsError('already-exists', 'Slug already in use');
    } else {
      // Random slug — retry on rare collision.
      for (let i = 0; i < MAX_SLUG_GENERATION_RETRIES; i++) {
        const candidate = genSlug();
        const existing = await db.collection('shortLinks').doc(candidate).get();
        if (!existing.exists) {
          slug = candidate;
          break;
        }
      }
      if (!slug) throw new HttpsError('internal', 'Could not generate unique slug');
    }

    await db.collection('shortLinks').doc(slug).set({
      slug,
      url,
      createdAt: Date.now(),
      createdBy: req.auth.uid,
      expiresAt,
      hits: 0,
    });

    return { slug, url };
  },
);

export const caspianShareResolveShortLink = onRequest(
  { region: 'us-central1', cors: false, maxInstances: 10 },
  async (req: Request, res: Response) => {
    const segments = (req.path ?? '').split('/').filter(Boolean);
    const slug = segments[segments.length - 1];
    if (!slug || !SLUG_PATTERN.test(slug)) {
      res.status(400).send('Invalid short link');
      return;
    }
    const ref = db.collection('shortLinks').doc(slug);
    const snap = await ref.get();
    if (!snap.exists) {
      res.status(404).send('Short link not found');
      return;
    }
    const data = snap.data() as { url: string; expiresAt?: number };
    if (data.expiresAt && Date.now() > data.expiresAt) {
      res.status(410).send('Short link expired');
      return;
    }
    // Best-effort hit counter — fire-and-forget, doesn't block redirect.
    ref.update({ hits: FieldValue.increment(1) }).catch(() => {});
    res.redirect(302, data.url);
  },
);

// ─── OG metadata fetcher (SSRF-hardened) ────────────────────────────────────

import { lookup } from 'node:dns/promises';

const OG_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const OG_MAX_BYTES = 1024 * 1024;
const OG_TIMEOUT_MS = 5_000;
const OG_MAX_REDIRECTS = 3;

const PRIVATE_IPV4: RegExp[] = [
  /^10\./, /^127\./, /^169\.254\./, /^172\.(1[6-9]|2[0-9]|3[0-1])\./, /^192\.168\./,
  /^0\./, /^100\.(6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7])\./, /^198\.1[89]\./,
  /^192\.0\.0\./, /^192\.0\.2\./, /^198\.51\.100\./, /^203\.0\.113\./, /^240\./,
  /^255\.255\.255\.255$/,
];

function isPrivateIp(ip: string): boolean {
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) {
    return PRIVATE_IPV4.some((p) => p.test(ip));
  }
  const lower = ip.toLowerCase();
  if (lower === '::' || lower === '::1') return true;
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
  if (lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) return true;
  const v4Map = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(lower);
  if (v4Map) return PRIVATE_IPV4.some((p) => p.test(v4Map[1]));
  return false;
}

async function assertPublicHost(host: string): Promise<void> {
  const records = await lookup(host, { all: true });
  if (records.length === 0) throw new HttpsError('failed-precondition', `Cannot resolve ${host}`);
  for (const r of records) {
    if (isPrivateIp(r.address)) {
      throw new HttpsError('permission-denied', `Refused private address ${r.address} for ${host}`);
    }
  }
}

interface FetchOgMetadataRequest { url: string; force?: boolean; }
interface OgMetadata {
  url: string;
  resolvedUrl?: string;
  title?: string;
  description?: string;
  image?: string;
  imageAlt?: string;
  siteName?: string;
  type?: string;
  locale?: string;
  twitterCard?: string;
  twitterCreator?: string;
  fetchedAt: number;
}

function decodeHtml(s: string): string {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function parseOg(html: string, finalUrl: string, originalUrl: string): OgMetadata {
  const headMatch = /<head[\s\S]*?<\/head>/i.exec(html);
  const head = headMatch ? headMatch[0] : html.slice(0, 64 * 1024);
  const tags = new Map<string, string>();
  const re = /<meta\s+([^>]+?)\/?>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(head))) {
    const attrs = new Map<string, string>();
    const ar = /(\w[\w:-]*)\s*=\s*"([^"]*)"|(\w[\w:-]*)\s*=\s*'([^']*)'/g;
    let am: RegExpExecArray | null;
    while ((am = ar.exec(m[1]))) attrs.set((am[1] ?? am[3]).toLowerCase(), am[2] ?? am[4]);
    const key = (attrs.get('property') ?? attrs.get('name') ?? '').toLowerCase();
    const val = attrs.get('content');
    if (key && val && !tags.has(key)) tags.set(key, val);
  }
  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(head);
  const get = (...ks: string[]) => {
    for (const k of ks) { const v = tags.get(k.toLowerCase()); if (v) return decodeHtml(v); }
    return undefined;
  };
  const abs = (s: string | undefined) => {
    if (!s) return undefined;
    try { return new URL(s, finalUrl).toString(); } catch { return undefined; }
  };
  return {
    url: originalUrl,
    resolvedUrl: finalUrl !== originalUrl ? finalUrl : undefined,
    title: get('og:title', 'twitter:title') ?? (titleMatch ? decodeHtml(titleMatch[1].trim()) : undefined),
    description: get('og:description', 'twitter:description', 'description'),
    image: abs(get('og:image:secure_url', 'og:image', 'twitter:image')),
    imageAlt: get('og:image:alt', 'twitter:image:alt'),
    siteName: get('og:site_name'),
    type: get('og:type'),
    locale: get('og:locale'),
    twitterCard: get('twitter:card'),
    twitterCreator: get('twitter:creator'),
    fetchedAt: Date.now(),
  };
}

async function fetchOgMetadata(rawUrl: string): Promise<OgMetadata> {
  let current = rawUrl;
  const startedAt = Date.now();
  for (let hop = 0; hop <= OG_MAX_REDIRECTS; hop++) {
    let parsed: URL;
    try { parsed = new URL(current); } catch {
      throw new HttpsError('invalid-argument', `Invalid URL: ${current}`);
    }
    if (parsed.protocol !== 'https:') {
      throw new HttpsError('failed-precondition', `Disallowed scheme ${parsed.protocol}`);
    }
    await assertPublicHost(parsed.hostname);
    const remaining = OG_TIMEOUT_MS - (Date.now() - startedAt);
    if (remaining <= 0) throw new HttpsError('deadline-exceeded', 'Total timeout exceeded');
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), remaining);
    let res: Response;
    try {
      res = await fetch(parsed.toString(), {
        method: 'GET',
        redirect: 'manual',
        signal: ctl.signal,
        headers: {
          accept: 'text/html,application/xhtml+xml',
          'user-agent': 'CaspianShareBot/1.0',
        },
      });
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        throw new HttpsError('deadline-exceeded', `Timed out after ${OG_TIMEOUT_MS}ms`);
      }
      throw new HttpsError('unavailable', `Fetch failed: ${(e as Error).message}`);
    } finally {
      clearTimeout(t);
    }
    if (res.status >= 300 && res.status < 400) {
      const next = res.headers.get('location');
      if (!next) throw new HttpsError('aborted', 'Redirect without Location');
      current = new URL(next, parsed).toString();
      continue;
    }
    if (!res.ok) {
      throw new HttpsError('unavailable', `Upstream ${res.status}`);
    }
    const ct = (res.headers.get('content-type') ?? '').toLowerCase();
    if (!ct.startsWith('text/html') && !ct.startsWith('application/xhtml+xml')) {
      throw new HttpsError('failed-precondition', `Bad content-type: ${ct}`);
    }
    const reader = res.body?.getReader();
    if (!reader) {
      const text = await res.text();
      if (text.length > OG_MAX_BYTES) throw new HttpsError('out-of-range', 'Body too large');
      return parseOg(text, current, rawUrl);
    }
    const dec = new TextDecoder('utf-8', { fatal: false, ignoreBOM: true });
    let html = '', total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > OG_MAX_BYTES) {
        try { await reader.cancel(); } catch {}
        throw new HttpsError('out-of-range', 'Body too large');
      }
      html += dec.decode(value, { stream: true });
      if (html.length > 64 * 1024 && /<\/head>/i.test(html)) {
        try { await reader.cancel(); } catch {}
        break;
      }
    }
    html += dec.decode();
    return parseOg(html, current, rawUrl);
  }
  throw new HttpsError('out-of-range', `Exceeded ${OG_MAX_REDIRECTS} redirects`);
}

const ogRateState = new Map<string, { minute: number; count: number }>();
const OG_RATE_PER_MIN = 20;

function cyrb53(str: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, '0').slice(0, 6) + (h1 >>> 0).toString(16).padStart(8, '0');
}

export const caspianShareFetchOgMetadata = onCall<
  FetchOgMetadataRequest,
  Promise<OgMetadata>
>(
  { region: 'us-central1', cors: true, maxInstances: 5, timeoutSeconds: 15 },
  async (req: CallableRequest<FetchOgMetadataRequest>) => {
    const { url, force } = req.data ?? ({} as FetchOgMetadataRequest);
    if (typeof url !== 'string' || url.length === 0 || url.length > MAX_URL_LEN) {
      throw new HttpsError('invalid-argument', 'Invalid URL');
    }
    const key = req.auth?.uid ?? req.rawRequest?.ip ?? 'anon';
    const minute = Math.floor(Date.now() / 60_000);
    const tracked = ogRateState.get(key);
    if (tracked && tracked.minute === minute) {
      if (tracked.count + 1 > OG_RATE_PER_MIN) {
        throw new HttpsError('resource-exhausted', 'Rate limit exceeded');
      }
      tracked.count += 1;
    } else {
      ogRateState.set(key, { minute, count: 1 });
    }

    const id = cyrb53(normalizeUrl(url));
    const ref = db.collection('ogCache').doc(id);
    if (!force) {
      const cached = await ref.get();
      if (cached.exists) {
        const data = cached.data() as OgMetadata;
        if (Date.now() - data.fetchedAt < OG_CACHE_TTL_MS) return data;
      }
    }
    const metadata = await fetchOgMetadata(url);
    await ref.set(metadata);
    return metadata;
  },
);

// ─── Daily roll-up trigger (Phase 7 / v1.0.0) ───────────────────────────────
//
// Watches new documents in `shareEvents/{eventId}` (only created when the
// caller opted into `analytics: 'detailed'`) and increments the corresponding
// `shareCountsDaily/{yyyymmdd}_{urlHash}` doc. Read these from BigQuery or
// directly via `useShareEvents` for daily share-count charts without scanning
// the full event log.

interface ShareEventCreated {
  url: string;
  normalizedUrl: string;
  urlHash: string;
  platformId: string;
  ts: number;
  yyyymmdd: string;
}

export const caspianShareDailyRollup = onDocumentCreated(
  { region: 'us-central1', document: 'shareEvents/{eventId}' },
  async (event) => {
    const data = event.data?.data() as ShareEventCreated | undefined;
    if (!data || !data.urlHash || !data.yyyymmdd || !data.platformId) return;
    const dailyId = `${data.yyyymmdd}_${data.urlHash}`;
    await db
      .collection('shareCountsDaily')
      .doc(dailyId)
      .set(
        {
          yyyymmdd: data.yyyymmdd,
          urlHash: data.urlHash,
          url: data.normalizedUrl ?? data.url,
          total: FieldValue.increment(1),
          byPlatform: { [data.platformId]: FieldValue.increment(1) },
          updatedAt: Date.now(),
        },
        { merge: true },
      );
  },
);
