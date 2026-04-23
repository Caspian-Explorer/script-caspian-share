# Changelog

All notable changes will be documented in this file.

<!--
Every entry MUST include exactly one of these two headings:

  ### Consumer action required on upgrade
  (followed by a fenced bash block of exact commands, or a numbered list)

  ### No consumer action required
  (followed by a one-line explanation, e.g. "internal build config only; existing
  installs unaffected" or "scaffolder-only change; does not touch consumer sites")

Do not omit the heading, rename it, or fold it into `### Notes`. This is how
customers tell at a glance whether an upgrade needs attention.
-->

## v1.0.0 — Initial public release

The full feature set across all seven planned phases shipped in a single 1.0 release. The library is now a complete framework-agnostic share-buttons package for Next.js apps hosted on Firebase or Vercel, with an optional Firestore + Cloud Functions backend covering counts, short links, OG metadata, and detailed analytics.

### Added

**Provider, registry, primitives**
- `<CaspianShareProvider>` ([src/provider/caspian-share-provider.tsx](src/provider/caspian-share-provider.tsx)) — root provider taking `firebaseConfig`, `adapters`, `analytics`, `defaultUrl`, `defaultTitle`, `defaultDescription`, `platforms`, `utm`, `theme`, `messages`/`messagesByLocale`, `firebaseAppName`, `functionsRegion`, `onShare`. Provider chain: LocaleProvider → ThemeProvider → CaspianShareFirebaseProvider (only when `firebaseConfig` is passed) → PlatformRegistryProvider.
- `registerPlatform({ id, label, color, buildShareUrl })` API + `defaultPlatforms` array. Built-in platforms register through the same API consumers use, so unused platforms tree-shake out.
- Framework-adapter contract at [src/primitives/types.ts](src/primitives/types.ts) — `{ Link, Image?, useNavigation }`. **Identical shape to `@caspian-explorer/script-caspian-store`** so consumers reuse the same adapter object across both packages.

**14 built-in platforms** ([src/platforms/](src/platforms/))
- `twitter`, `facebook`, `linkedin`, `whatsapp`, `telegram`, `reddit`, `pinterest`, `threads`, `bluesky`, `mastodon`, `hacker-news`, `pocket`, `email`, `sms`. Each in its own file for tree-shaking.

**Components** ([src/components/](src/components/))
- `<ShareBar>` — `layout: 'inline' | 'sidebar'`, position controls
- `<ShareButton>` — single-platform, size + variant props
- `<ShareDialog>` — modal with platform grid, message editor, `<LinkPreview>`, `<QrCodeButton>`, `<CopyLinkButton>`
- `<ShareMenu>` — native-share-or-dropdown trigger
- `<NativeShareButton>` — SSR-safe Web Share API; renders the copy-link fallback on server + first client render, upgrades to `navigator.share` in `useEffect` to avoid hydration mismatch
- `<CopyLinkButton>` — wraps `useClipboard`
- `<QrCodeButton>` — lazy-imports `qrcode` on click
- `<ShareCount>` — reads sharded counter (Phase 4 backend)
- `<LinkPreview>` — renders `useOgMetadata` (Phase 6 backend)
- `<EmbedCodeGenerator>` — `<iframe>` snippet with sandbox attrs
- `<ShareEventStream>` — admin list view of `shareEvents` (detailed analytics mode)
- `<PlatformIcon>`, `<Portal>` — primitives

**Hooks** ([src/hooks/](src/hooks/))
- `useShare`, `useShareUrl` (UTM tagger), `useClipboard`, `useNativeShare`, `useShareCount`, `useShareAnalytics` (debounced 3 s flush, 50-event max, flushes on `pagehide` / `visibilitychange`), `useCreateShortLink`, `useQrCode`, `useOgMetadata`, `useShareEvents`, `useShareCountsDaily`, `useOutsideClick`, `useEscapeKey`

**Server-safe sub-entry** ([src/server/](src/server/))
- `./server` exports `<ShareBarServer>` — pure `<a target="_blank" rel="noopener noreferrer">` row, ships 0 KB JS for static-link cases. Plus `applyUtmTags`, `platformUtmTags`, `defaultPlatforms`, `findPlatform`.

**OG sub-entry** ([src/og/](src/og/))
- `./og` exports `OgImageTemplate`, `buildOgImageUrl`, `createOgHandler`. Runtime-neutral; `createOgHandler` lazy-imports `@vercel/og`.

**Firebase sub-entry** ([src/firebase/](src/firebase/))
- `./firebase` exports `initCaspianShareFirebase`, collection refs, sharded counter helpers, short-link resolver, OG cache helpers, event helpers, rules + indexes string mirrors, Cloud Function source string. Browser-safe and Node-safe — does **not** re-export `og-fetcher.ts` (which uses `node:dns/promises`); the SSRF-hardened fetcher lives there for Cloud Function imports only.
- 10-shard counter at `shareCounts/{urlHash}/shards/{0..9}` with materialized aggregate. URL hashing via cyrb53 on a normalized URL (UTM/fbclid/fragment stripped, default ports dropped, params sorted, host lowercased) — see [src/firebase/url-hash.ts](src/firebase/url-hash.ts).
- Analytics modes: `'counter'` (default — sharded counts only) or `'detailed'` (also writes `shareEvents/{id}` docs with `expiresAt`, triggers daily rollup into `shareCountsDaily/{yyyymmdd}_{urlHash}`).

**Cloud Functions** ([firebase/functions/](firebase/functions/))
- `caspianShareRecordEvents` — callable, rate-limited (30/min/IP), writes shards + aggregate + optional `shareEvents` in a single Firestore batch
- `caspianShareCreateShortLink` — callable, auth-gated, slug-collision retry
- `caspianShareResolveShortLink` — HTTP, designed as Firebase Hosting rewrite target
- `caspianShareFetchOgMetadata` — callable, SSRF-hardened (DNS preflight via `node:dns/promises`, HTTPS-only, RFC1918/loopback/link-local/CGNAT/IPv6 ULA rejection, 5 s timeout, 1 MB cap, ≤3 redirects each re-validated, `text/html` check, regex-only `<head>` parser), 24 h Firestore-cached by `sha256(normalizeUrl(url))`
- `caspianShareDailyRollup` — Firestore trigger on `shareEvents/{id}` → `shareCountsDaily/{yyyymmdd}_{urlHash}`

**Firestore artifacts** ([firebase/](firebase/))
- `firestore.rules` — `shareCounts`, `shortLinks`, `ogCache`, `shareEvents`, `shareCountsDaily` all public-read or auth-read, **no client write**. All writes flow through Cloud Function callables.
- `firestore.indexes.json` — 3 composite indexes: `shareEvents(urlHash, ts desc)`, `shareEvents(urlHash, platformId, ts desc)`, `shareCountsDaily(urlHash, yyyymmdd desc)`.

**Theming + i18n**
- CSS custom properties (`--caspian-share-primary`, `--caspian-share-accent`, `--caspian-share-radius`, …) with theme presets
- `LocaleProvider` + central message table at [src/i18n/messages.ts](src/i18n/messages.ts); English default. Consumers can pass `messages` or `messagesByLocale` to override.

**Scaffold CLI** ([scaffold/cli.mjs](scaffold/cli.mjs))
- Zero-dep wizard using `node:readline`. Generates a Next.js 14 App Router project pre-wired to `<CaspianShareProvider>`, with Next adapters, sample home page, OG image route (Vercel), short-link route (Vercel + Firebase), `firebase.json` with hosting rewrites, `firestore.rules`, `firestore.indexes.json`, and a `functions/` directory ready for the five Cloud Functions.
- Flags: `--minimal`, `--hosting=vercel|firebase|both`, `--yes`.

**Companion package** ([create-caspian-share/](create-caspian-share/))
- `create-caspian-share@0.1.0` published separately under the personal account. Enables `npm create caspian-share@latest my-app`. Git-clones this repo to a temp dir, runs the in-tree scaffolder, then deletes the clone — so users always get the latest scaffolder + Firebase artifacts on every invocation.

### Consumer action required on upgrade

Brand-new package — there is nothing to upgrade from. To install fresh:

```bash
# Option A — scaffold a new app
npm create caspian-share@latest my-share-app

# Option B — install into an existing React app
npm install @caspian-explorer/script-caspian-share

# Optional peer deps (install only what you use)
npm install firebase           # share counts, short links, OG cache, analytics
npm install @vercel/og         # dynamic OG image generation
npm install qrcode             # <QrCodeButton>
```

Full setup steps (Firebase project, Cloud Functions deploy, TTL policy on `shareEvents.expiresAt` for detailed analytics, BigQuery export) are in [INSTALL.md](INSTALL.md).
