/**
 * Source of the Cloud Function that powers `recordShareEvents`. Exported as a
 * string so the scaffold CLI can drop it into the consumer's
 * `functions/src/index.ts`.
 *
 * The function:
 *   - validates each event (url + platformId required, url ≤ 2048 chars)
 *   - rejects requests with > 50 events per call
 *   - rate-limits per UID at 30 events / minute (in-memory; for stricter
 *     limits add Firestore-backed counters or App Check)
 *   - increments a random shard of `shareCounts/{urlHash}/shards/{shardIndex}`
 *     and the materialized aggregate at `shareCounts/{urlHash}` in one batch
 *
 * The corresponding client callable is `caspianShareRecordEvents`.
 */
export const RECORD_SHARE_EVENTS_FUNCTION_SOURCE = `import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

if (!getApps().length) initializeApp();
const db = getFirestore();

const SHARDS = 10;
const MAX_EVENTS_PER_CALL = 50;
const MAX_URL_LEN = 2048;
const RATE_LIMIT_PER_MIN = 30;

// Tiny in-memory rate limit. For production-grade limits, swap for App Check
// + Firestore-backed counters keyed by UID/IP.
const rateState = new Map();

function cyrb53(str) {
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

const STRIPPED = new Set([
  'utm_source','utm_medium','utm_campaign','utm_term','utm_content','utm_id',
  'fbclid','gclid','mc_cid','mc_eid','ref',
]);
function normalizeUrl(url) {
  let p;
  try { p = new URL(url, 'https://placeholder.invalid'); } catch { return url; }
  p.hash = '';
  p.protocol = p.protocol.toLowerCase();
  p.hostname = p.hostname.toLowerCase();
  if ((p.protocol === 'http:' && p.port === '80') || (p.protocol === 'https:' && p.port === '443')) p.port = '';
  if (p.pathname === '/') p.pathname = '';
  const filtered = [];
  for (const [k, v] of p.searchParams.entries()) {
    if (!STRIPPED.has(k.toLowerCase())) filtered.push([k, v]);
  }
  filtered.sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
  p.search = '';
  for (const [k, v] of filtered) p.searchParams.append(k, v);
  if (p.host === 'placeholder.invalid') return p.pathname + p.search;
  return p.toString();
}

export const caspianShareRecordEvents = onCall(
  { region: 'us-central1', cors: true, maxInstances: 5 },
  async (req) => {
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

    let accepted = 0, rejected = 0;
    const batch = db.batch();
    for (const ev of events) {
      if (typeof ev?.url !== 'string' || ev.url.length === 0 || ev.url.length > MAX_URL_LEN ||
          typeof ev?.platformId !== 'string' || ev.platformId.length === 0) {
        rejected += 1;
        continue;
      }
      const normalized = normalizeUrl(ev.url);
      const id = cyrb53(normalized);
      const shardIndex = Math.floor(Math.random() * SHARDS);
      const shardRef = db.collection('shareCounts').doc(id).collection('shards').doc(String(shardIndex));
      batch.set(shardRef, {
        count: FieldValue.increment(1),
        byPlatform: { [ev.platformId]: FieldValue.increment(1) },
      }, { merge: true });
      const aggRef = db.collection('shareCounts').doc(id);
      batch.set(aggRef, {
        url: normalized,
        total: FieldValue.increment(1),
        byPlatform: { [ev.platformId]: FieldValue.increment(1) },
        updatedAt: Date.now(),
      }, { merge: true });
      accepted += 1;
    }
    await batch.commit();
    return { accepted, rejected };
  }
);
`.trim();
