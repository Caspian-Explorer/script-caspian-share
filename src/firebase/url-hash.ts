/**
 * Synchronous URL normalizer + 64-bit hash. Used as the document ID for
 * `shareCounts/{urlHash}`.
 *
 * Normalization (deterministic, locale-independent):
 *   - lowercases scheme + host
 *   - strips fragment (#…)
 *   - strips utm_* and fbclid query params
 *   - sorts remaining query params alphabetically
 *   - removes default ports (80/443) and trailing slash on root path
 *
 * Hash uses cyrb53 — fast, well-distributed, sync (no Web Crypto round trip).
 * Collision probability is negligible at the scales this counter is meant for
 * (~one per billion URLs); acceptable for analytics counters.
 */

const STRIPPED_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'fbclid',
  'gclid',
  'mc_cid',
  'mc_eid',
  'ref',
]);

export function normalizeUrl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url, 'https://placeholder.invalid');
  } catch {
    return url;
  }

  parsed.hash = '';
  parsed.protocol = parsed.protocol.toLowerCase();
  parsed.hostname = parsed.hostname.toLowerCase();

  if ((parsed.protocol === 'http:' && parsed.port === '80') ||
      (parsed.protocol === 'https:' && parsed.port === '443')) {
    parsed.port = '';
  }

  if (parsed.pathname === '/') parsed.pathname = '';

  // Sort & filter query params for determinism.
  const filtered: [string, string][] = [];
  for (const [k, v] of parsed.searchParams.entries()) {
    if (!STRIPPED_PARAMS.has(k.toLowerCase())) filtered.push([k, v]);
  }
  filtered.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  parsed.search = '';
  for (const [k, v] of filtered) parsed.searchParams.append(k, v);

  if (parsed.host === 'placeholder.invalid') {
    return `${parsed.pathname}${parsed.search}`;
  }
  return parsed.toString();
}

/** cyrb53 — sync 53-bit hash, returns lowercase hex string of length 14. */
function cyrb53(str: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
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
  return `${high}${low}`;
}

/**
 * Returns the deterministic shareCounts document ID for a URL. Pass the same
 * URL twice (with or without UTM params) and you get the same hash.
 */
export function urlHash(url: string): string {
  return cyrb53(normalizeUrl(url));
}
