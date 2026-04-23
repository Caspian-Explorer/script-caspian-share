/**
 * SSRF-hardened Open Graph metadata fetcher. **Node-only** — relies on
 * `node:dns/promises` and native `fetch` (Node 18+). Importing this module in
 * a browser bundle will fail at runtime; use it from Cloud Functions or
 * Server Components.
 *
 * Hardening checklist:
 *   - HTTPS scheme only (no http:, file:, data:, gopher:, etc.)
 *   - DNS pre-flight: resolve host, reject loopback/private/link-local IPs
 *   - 5-second connect+response timeout via AbortSignal
 *   - 1 MB response cap — any bytes beyond that are discarded
 *   - Max 3 manual redirects (we drive redirects ourselves to re-validate
 *     each Location target against the IP allowlist)
 *   - Content-Type must start with `text/html`
 *   - <head> regex extraction only — no DOM/HTML parser, no script execution
 *
 * Known limitation: Node's native `fetch` does not let us pin DNS per request,
 * so a DNS-rebinding attacker who controls the upstream resolver could swap
 * IPs between our preflight and the actual connect. For paranoid setups,
 * substitute `undici` with a custom `lookup` that re-validates inside the
 * connect callback. See comments in `dispatcher` below for the swap point.
 */
import { lookup } from 'node:dns/promises';
import type { OgMetadata } from './types';

const ALLOWED_PROTOCOLS = new Set(['https:']);
const MAX_BYTES = 1024 * 1024;
const TIMEOUT_MS = 5_000;
const MAX_REDIRECTS = 3;
const HEAD_SLICE_BYTES = 64 * 1024;

export interface FetchOgMetadataOptions {
  /** Override max response size in bytes. Default 1 MB. */
  maxBytes?: number;
  /** Override total timeout in ms. Default 5000. */
  timeoutMs?: number;
  /** Override redirect cap. Default 3. */
  maxRedirects?: number;
  /** Allow `http:` in addition to `https:`. STRONGLY DISCOURAGED. Default false. */
  allowHttp?: boolean;
  /** User-Agent header. Default a generic bot identifier. */
  userAgent?: string;
}

export class OgFetchError extends Error {
  readonly code:
    | 'invalid-url'
    | 'disallowed-scheme'
    | 'private-address'
    | 'dns-resolution-failed'
    | 'timeout'
    | 'too-large'
    | 'bad-content-type'
    | 'redirect-loop'
    | 'http-error'
    | 'parse-error';

  constructor(code: OgFetchError['code'], message: string) {
    super(message);
    this.name = 'OgFetchError';
    this.code = code;
  }
}

/**
 * Fetch and parse OG/Twitter metadata for a URL with SSRF hardening. Throws
 * `OgFetchError` for any rejected request.
 */
export async function fetchOgMetadata(
  url: string,
  options: FetchOgMetadataOptions = {},
): Promise<OgMetadata> {
  const {
    maxBytes = MAX_BYTES,
    timeoutMs = TIMEOUT_MS,
    maxRedirects = MAX_REDIRECTS,
    allowHttp = false,
    userAgent = 'CaspianShareBot/1.0 (+https://github.com/Caspian-Explorer/script-caspian-share)',
  } = options;

  const allowed = allowHttp ? new Set([...ALLOWED_PROTOCOLS, 'http:']) : ALLOWED_PROTOCOLS;
  let current = url;
  const startUrl = url;
  const startedAt = Date.now();

  for (let hop = 0; hop <= maxRedirects; hop++) {
    const parsed = parseAndValidateUrl(current, allowed);
    await assertPublicHost(parsed.hostname);

    const remaining = timeoutMs - (Date.now() - startedAt);
    if (remaining <= 0) throw new OgFetchError('timeout', 'Total timeout exceeded');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), remaining);
    let response: Response;
    try {
      response = await fetch(parsed.toString(), {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          accept: 'text/html,application/xhtml+xml',
          'user-agent': userAgent,
        },
      });
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        throw new OgFetchError('timeout', `Fetch timed out after ${timeoutMs}ms`);
      }
      throw new OgFetchError('http-error', `Fetch failed: ${(e as Error).message}`);
    } finally {
      clearTimeout(timer);
    }

    if (response.status >= 300 && response.status < 400) {
      const next = response.headers.get('location');
      if (!next) throw new OgFetchError('redirect-loop', 'Redirect without Location');
      // Resolve relative redirects against the previous URL.
      current = new URL(next, parsed).toString();
      continue;
    }
    if (!response.ok) {
      throw new OgFetchError('http-error', `Upstream returned ${response.status}`);
    }

    const contentType = (response.headers.get('content-type') ?? '').toLowerCase();
    if (!contentType.startsWith('text/html') && !contentType.startsWith('application/xhtml+xml')) {
      throw new OgFetchError('bad-content-type', `Expected text/html, got "${contentType}"`);
    }

    const html = await readBodyCapped(response, maxBytes);
    const head = extractHead(html);
    const metadata = parseMetadata(head, current, startUrl);
    return metadata;
  }

  throw new OgFetchError('redirect-loop', `Exceeded ${maxRedirects} redirects`);
}

// ─── Internals ───────────────────────────────────────────────────────────────

function parseAndValidateUrl(raw: string, allowed: Set<string>): URL {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new OgFetchError('invalid-url', `Could not parse URL: ${raw}`);
  }
  if (!allowed.has(parsed.protocol)) {
    throw new OgFetchError('disallowed-scheme', `Disallowed scheme: ${parsed.protocol}`);
  }
  return parsed;
}

async function assertPublicHost(hostname: string): Promise<void> {
  const candidates = await resolveCandidates(hostname);
  if (candidates.length === 0) {
    throw new OgFetchError('dns-resolution-failed', `Could not resolve ${hostname}`);
  }
  for (const ip of candidates) {
    if (isPrivateIp(ip)) {
      throw new OgFetchError('private-address', `Refused private IP ${ip} for ${hostname}`);
    }
  }
}

async function resolveCandidates(hostname: string): Promise<string[]> {
  // If a literal IP was passed, lookup() returns it as-is.
  try {
    const records = await lookup(hostname, { all: true });
    return records.map((r) => r.address);
  } catch (e) {
    throw new OgFetchError('dns-resolution-failed', (e as Error).message);
  }
}

const PRIVATE_IPV4_PATTERNS: RegExp[] = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^0\./,
  /^100\.(6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7])\./, // CGNAT 100.64.0.0/10
  /^198\.1[89]\./, // benchmark 198.18.0.0/15
  /^192\.0\.0\./, // IETF protocol assignments
  /^192\.0\.2\./, // TEST-NET-1
  /^198\.51\.100\./, // TEST-NET-2
  /^203\.0\.113\./, // TEST-NET-3
  /^240\./, // class E reserved
  /^255\.255\.255\.255$/, // broadcast
];

export function isPrivateIp(ip: string): boolean {
  // IPv4
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) {
    return PRIVATE_IPV4_PATTERNS.some((p) => p.test(ip));
  }
  // IPv6 — coarse but correct for the addresses that matter.
  const lower = ip.toLowerCase();
  if (lower === '::' || lower === '::1') return true;
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // ULA fc00::/7
  if (lower.startsWith('fe80:') || lower.startsWith('fe8') || lower.startsWith('fe9') ||
      lower.startsWith('fea') || lower.startsWith('feb')) return true; // link-local fe80::/10
  // IPv4-mapped IPv6: ::ffff:1.2.3.4
  const v4MapMatch = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(lower);
  if (v4MapMatch) return PRIVATE_IPV4_PATTERNS.some((p) => p.test(v4MapMatch[1]));
  return false;
}

async function readBodyCapped(response: Response, maxBytes: number): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) {
    const text = await response.text();
    if (text.length > maxBytes) {
      throw new OgFetchError('too-large', `Body exceeds ${maxBytes} bytes`);
    }
    return text;
  }
  const decoder = new TextDecoder('utf-8', { fatal: false, ignoreBOM: true });
  let total = 0;
  let html = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      try { await reader.cancel(); } catch { /* noop */ }
      throw new OgFetchError('too-large', `Body exceeds ${maxBytes} bytes`);
    }
    html += decoder.decode(value, { stream: true });
    // Once we have the head, we can short-circuit to avoid downloading whole pages.
    if (html.length > HEAD_SLICE_BYTES && /<\/head>/i.test(html)) {
      try { await reader.cancel(); } catch { /* noop */ }
      break;
    }
  }
  html += decoder.decode();
  return html;
}

function extractHead(html: string): string {
  const match = /<head[\s\S]*?<\/head>/i.exec(html);
  return match ? match[0] : html.slice(0, HEAD_SLICE_BYTES);
}

function parseMetadata(head: string, finalUrl: string, originalUrl: string): OgMetadata {
  const tags = collectMetaTags(head);
  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(head);
  const titleFromTag = titleMatch ? decodeHtml(titleMatch[1].trim()) : undefined;

  const get = (...keys: string[]): string | undefined => {
    for (const k of keys) {
      const value = tags.get(k.toLowerCase());
      if (value) return decodeHtml(value);
    }
    return undefined;
  };

  return {
    url: originalUrl,
    resolvedUrl: finalUrl !== originalUrl ? finalUrl : undefined,
    title: get('og:title', 'twitter:title') ?? titleFromTag,
    description: get('og:description', 'twitter:description', 'description'),
    image: absolutize(get('og:image:secure_url', 'og:image', 'twitter:image'), finalUrl),
    imageAlt: get('og:image:alt', 'twitter:image:alt'),
    siteName: get('og:site_name'),
    type: get('og:type'),
    locale: get('og:locale'),
    twitterCard: normalizeTwitterCard(get('twitter:card')),
    twitterCreator: get('twitter:creator'),
    fetchedAt: Date.now(),
  };
}

function collectMetaTags(head: string): Map<string, string> {
  const out = new Map<string, string>();
  const re = /<meta\s+([^>]+?)\/?>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(head))) {
    const attrs = parseAttrs(m[1]);
    const key = (attrs.get('property') ?? attrs.get('name') ?? '').toLowerCase();
    const value = attrs.get('content');
    if (key && value && !out.has(key)) out.set(key, value);
  }
  return out;
}

function parseAttrs(attrString: string): Map<string, string> {
  const out = new Map<string, string>();
  const re = /(\w[\w:-]*)\s*=\s*"([^"]*)"|(\w[\w:-]*)\s*=\s*'([^']*)'/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(attrString))) {
    const k = (m[1] ?? m[3]).toLowerCase();
    const v = m[2] ?? m[4];
    out.set(k, v);
  }
  return out;
}

function decodeHtml(input: string): string {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function absolutize(maybeUrl: string | undefined, base: string): string | undefined {
  if (!maybeUrl) return undefined;
  try {
    return new URL(maybeUrl, base).toString();
  } catch {
    return undefined;
  }
}

function normalizeTwitterCard(input: string | undefined): OgMetadata['twitterCard'] {
  switch (input) {
    case 'summary':
    case 'summary_large_image':
    case 'app':
    case 'player':
      return input;
    default:
      return undefined;
  }
}
