# @caspian-explorer/script-caspian-share

Framework-agnostic React share buttons for **Next.js on Firebase or Vercel**. Native share, copy link, dropdown menu, dialog, sticky sidebar, inline bar — bring your own backend.

Sister package to [`@caspian-explorer/script-caspian-store`](https://github.com/Caspian-Explorer/script-caspian-store); shares the same adapter contract so a single `adapters` object works for both.

## Status

**v1.0.0 — Stable**. Detailed event-stream analytics with `analytics: 'detailed'`, daily roll-ups (`shareCountsDaily/{yyyymmdd}_{urlHash}`), `useShareEvents` / `useShareCountsDaily` hooks, `<ShareEventStream>` component, and BigQuery export via the Firebase extension. Configure a Firestore TTL policy on `shareEvents.expiresAt` (default 90 days) so the event log auto-prunes.

| Phase | Status | Adds |
|---|---|---|
| 0.1.0 | ✓ shipped | Provider, registry, 14 platforms, `<ShareBar>`, copy link, native share, server sub-entry |
| 0.2.0 | ✓ shipped | `<ShareDialog>`, `<ShareMenu>`, scaffold CLI, theming, i18n |
| 0.3.0 | ✓ shipped | `./og` sub-entry — `OgImageTemplate`, `buildOgImageUrl`, `createOgHandler` |
| 0.4.0 | ✓ shipped | `./firebase` — sharded share counter, Cloud Function, `<ShareCount>`, `useShareCount`, `useShareAnalytics` |
| 0.5.0 | ✓ shipped | Short links, `<QrCodeButton>` (lazy `qrcode`), `<EmbedCodeGenerator>` |
| 0.6.0 | ✓ shipped | SSRF-hardened OG metadata fetcher, `useOgMetadata`, `<LinkPreview>` |
| **1.0.0** | **✓ shipped** | **Detailed event log, daily rollups, `useShareEvents`, `<ShareEventStream>`, BigQuery docs** |

See [CHANGELOG.md](CHANGELOG.md) for the full release notes and [INSTALL.md](INSTALL.md) for end-to-end setup (Firebase deploy, Cloud Functions, TTL policy, BigQuery export).

## Scaffold a new app

```bash
npm create caspian-share@latest my-share-app
```

Produces a Next.js 14 App Router project pre-wired to the provider, with `next/link` + `next/image` adapters, theming, i18n, an OG image route (Vercel) and a `firebase.json` (Firebase Hosting). Pass `--minimal` to skip backend scaffolding, `--hosting=vercel` or `--hosting=firebase` to target one provider, or `--yes` to skip all prompts.

If you can't use `npm create` (offline mirror, locked-down network), `npx @caspian-explorer/script-caspian-share init my-share-app` is an equivalent invocation against an installed package.

## Install

```bash
npm install @caspian-explorer/script-caspian-share
```

Optional peer dependencies (install only what you use):

```bash
npm install firebase           # Phase 4+: share counts, short links, OG cache
npm install @vercel/og         # Phase 3+: dynamic OG image generation
npm install qrcode             # Phase 5+: <QRCodeButton>
```

## Quickstart (Next.js 14 App Router)

`app/layout.tsx`:

```tsx
'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { CaspianShareProvider } from '@caspian-explorer/script-caspian-share';
import '@caspian-explorer/script-caspian-share/styles.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <html>
      <body>
        <CaspianShareProvider
          utm={{ campaign: 'site-share' }}
          adapters={{
            Link: ({ href, children, ...rest }) => <Link href={href} {...rest}>{children}</Link>,
            Image: (props) => <Image {...(props as any)} />,
            useNavigation: () => ({
              pathname,
              push: (href) => router.push(href),
              replace: (href) => router.replace(href),
              back: () => router.back(),
            }),
          }}
        >
          {children}
        </CaspianShareProvider>
      </body>
    </html>
  );
}
```

Drop a share bar into any page:

```tsx
import { ShareBar } from '@caspian-explorer/script-caspian-share';

export default function ArticlePage() {
  return (
    <article>
      <h1>The Article Title</h1>
      <ShareBar
        url="https://example.com/articles/123"
        title="The Article Title"
        platforms={['twitter', 'linkedin', 'whatsapp', 'email']}
        includeNative
        includeCopyLink
      />
    </article>
  );
}
```

## Server-safe variant (RSC, zero client JS)

```tsx
import { ShareBarServer } from '@caspian-explorer/script-caspian-share/server';

export default function PostFooter({ url, title }: { url: string; title: string }) {
  return <ShareBarServer url={url} title={title} platforms={['twitter', 'linkedin']} />;
}
```

The `/server` sub-entry renders pure `<a target="_blank">` tags — no `'use client'`, no clipboard, no Web Share API. Use it whenever you don't need interactive features and want the smallest possible payload.

## Sticky sidebar layout

```tsx
<ShareBar layout="sidebar" side="right" topOffset="50%" includeCopyLink />
```

## Single button

```tsx
import { ShareButton } from '@caspian-explorer/script-caspian-share';

<ShareButton platform="twitter" showLabel size="lg" shape="circle" />
```

## Native share with copy-link fallback

```tsx
import { NativeShareButton } from '@caspian-explorer/script-caspian-share';

<NativeShareButton title="Check this out" />
```

SSR-safe: renders the fallback during SSR + first client paint, then upgrades to `navigator.share` after `useEffect`. No hydration mismatch.

## Imperative API

```tsx
import { useShare } from '@caspian-explorer/script-caspian-share';

function MyComponent() {
  const { open, buildUrl } = useShare({ url: '/post/abc', title: 'My Post' });
  return <button onClick={() => open('twitter')}>Tweet this</button>;
}
```

## Modal share dialog

```tsx
'use client';
import { useState } from 'react';
import { ShareDialog } from '@caspian-explorer/script-caspian-share';

export function ShareCta({ url, title }: { url: string; title: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Share</button>
      <ShareDialog open={open} onOpenChange={setOpen} url={url} title={title} />
    </>
  );
}
```

The dialog includes an editable message textarea, a platform grid, a copy-link box, focus management, escape-key close, and click-outside dismissal. It honors the active theme and locale.

## Native share with dropdown fallback

```tsx
import { ShareMenu } from '@caspian-explorer/script-caspian-share';

<ShareMenu title="My Post" showLabel platforms={['twitter','linkedin','whatsapp']} />
```

On mobile devices that support the Web Share API, the trigger opens the OS share sheet directly. On desktop (or when the user cancels native share), it falls back to a dropdown of platform options with copy-link.

## Theming

Eight built-in presets: `light`, `dark`, `midnight`, `rose`, `forest`, `monoLight`, `monoDark`, `outlined`.

```tsx
import { CaspianShareProvider, THEME_PRESETS } from '@caspian-explorer/script-caspian-share';

<CaspianShareProvider
  theme={{
    ...THEME_PRESETS.midnight,
    primary: '#ff6b00',
    radius: 16,
    platformColors: { twitter: '#000', linkedin: '#005f8a' },
  }}
>
  ...
</CaspianShareProvider>
```

The `variant` field (`branded` | `monochrome` | `outlined`) controls how all buttons look unless individually overridden.

## Real-time share counts (Firebase)

Wire a `firebaseConfig` to the provider and a sharded Firestore counter starts tracking shares per URL. Reads happen via `<ShareCount>` (live updates) or `useShareCount(url)` (raw values).

```tsx
<CaspianShareProvider
  firebaseConfig={{
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  }}
>
  ...
</CaspianShareProvider>
```

Drop a count badge anywhere:

```tsx
import { ShareCount } from '@caspian-explorer/script-caspian-share';

<ShareCount url="https://example.com/post/123" label=" shares" hideZero />
```

Or read the raw values to render your own UI:

```tsx
import { useShareCount } from '@caspian-explorer/script-caspian-share';

const { count, byPlatform, loading } = useShareCount(url);
```

### How it works

- **Sharded counter:** every share increments a random shard of `shareCounts/{urlHash}/shards/{0..9}` plus the materialized aggregate at `shareCounts/{urlHash}`. Spreads write contention 10× and survives bursts of >10 shares/sec on a single URL.
- **Client-side batching:** `useShareAnalytics` debounces share events for 3 seconds (or 50 events) before calling the `caspianShareRecordEvents` Cloud Function. Pages that flush mid-session also flush on `pagehide`/`visibilitychange`.
- **URL normalization:** UTM params, fragments, default ports, and trailing slashes are stripped before hashing — sharing the same page from Twitter and a newsletter both bump the same counter.
- **Security rules:** `shareCounts/**` is publicly readable but **never client-writable**. All writes go through the Cloud Function, which validates payload shape, rate-limits per UID/IP, and rejects oversized URLs.

### Deploy the Cloud Function

```bash
cd functions
npm install
npm run deploy
```

The scaffold generates the boilerplate in `firebase/functions/` for new projects; for existing projects, copy [`firebase/functions/src/index.ts`](firebase/functions/src/index.ts) verbatim into your `functions/src/index.ts`.

Then deploy the matching Firestore rules:

```bash
firebase deploy --only firestore:rules
```

Find the rule snippet in [`firebase/firestore.rules`](firebase/firestore.rules) — paste into your existing rules between the `match /databases/{database}/documents { ... }` block.

### Optional analytics sink

If you'd rather route share events to your own analytics (PostHog, GA, Segment) instead of Firebase, skip `firebaseConfig` and pass `onShare`:

```tsx
<CaspianShareProvider
  onShare={({ platformId, url }) => posthog.capture('share', { platformId, url })}
>
```

You can use `firebaseConfig` AND `onShare` together — both fire on every share.

## Detailed share analytics + BigQuery export

Opt into the per-event log by setting `analytics: 'detailed'` on the provider. Every share event is then persisted to `shareEvents/{id}` (in addition to incrementing the sharded counter), a Firestore trigger materializes daily counts at `shareCountsDaily/{yyyymmdd}_{urlHash}`, and the whole stream is BigQuery-ready.

```tsx
<CaspianShareProvider
  firebaseConfig={firebaseConfig}
  analytics="detailed"
>
  ...
</CaspianShareProvider>
```

### Query recent events for a URL

```tsx
import { ShareEventStream, useShareEvents } from '@caspian-explorer/script-caspian-share';

// Drop-in component (admin/inline widget)
<ShareEventStream url={pageUrl} limit={20} />

// Or raw hook for custom UI
const { events, loading } = useShareEvents(pageUrl, { platformId: 'twitter', limit: 50 });
```

`shareEvents` reads require Firebase Auth (security rule). Pair this with your existing admin-only auth flow.

### Daily share velocity

```tsx
import { useShareCountsDaily } from '@caspian-explorer/script-caspian-share';

const { days } = useShareCountsDaily(pageUrl, { limit: 30 });
// days[0] = { yyyymmdd: '20260423', total: 142, byPlatform: {twitter: 88, ...} }
```

Use any chart library to render the trend — the rollup doc is the same shape Grafana / Plot / Recharts ingest natively.

### TTL policy (auto-prune)

Old events would inflate Firestore costs forever. Configure a TTL policy in the **Firebase Console → Firestore → TTL** tab:

- Collection: `shareEvents`
- Field: `expiresAt`

The Cloud Function sets `expiresAt = ts + 90 days` on every event. Adjust the constant in [firebase/functions/src/index.ts](firebase/functions/src/index.ts) if you want a different retention window.

### BigQuery export

Install the official **Stream Firestore to BigQuery** extension once:

```bash
firebase ext:install firebase/firestore-bigquery-export \
  --params=COLLECTION_PATH=shareEvents,DATASET_ID=caspian_share,TABLE_ID=share_events
```

Then query the materialized BigQuery view:

```sql
SELECT
  DATE(TIMESTAMP_MILLIS(JSON_EXTRACT_SCALAR(data, '$.ts') AS INT64)) AS day,
  JSON_EXTRACT_SCALAR(data, '$.platformId') AS platform,
  JSON_EXTRACT_SCALAR(data, '$.urlHash') AS url_hash,
  COUNT(*) AS shares
FROM `your-project.caspian_share.share_events_raw_changelog`
WHERE operation = 'CREATE'
GROUP BY day, platform, url_hash
ORDER BY day DESC, shares DESC;
```

The composite indexes shipped in [firebase/firestore.indexes.json](firebase/firestore.indexes.json) cover `(urlHash, ts desc)`, `(urlHash, platformId, ts desc)`, and `(urlHash, yyyymmdd desc)` — sufficient for `useShareEvents` and `useShareCountsDaily` without manual index creation.

## Open Graph link previews

```tsx
import { LinkPreview } from '@caspian-explorer/script-caspian-share';

<LinkPreview url="https://example.com/post/123" layout="card" />
```

Renders a themed preview card with the page's title, description, image, and site name. Powered by the `caspianShareFetchOgMetadata` Cloud Function (SSRF-hardened) plus a 24h `ogCache/{urlHash}` Firestore cache.

For a hookless flow:

```tsx
import { useOgMetadata } from '@caspian-explorer/script-caspian-share';

const { data, loading, error } = useOgMetadata(url);
```

`<ShareDialog>` automatically renders a compact `<LinkPreview>` when Firebase is configured — pass `preview={false}` to suppress it, or `preview={<MyCustomCard/>}` to override.

### Security: SSRF hardening

The OG fetcher inside `caspianShareFetchOgMetadata` enforces:

- **HTTPS only** — `http:`, `file:`, `data:`, `gopher:`, etc. all rejected
- **DNS preflight** — resolves the host first; rejects loopback, RFC1918, link-local, CGNAT, IPv6 ULA, GCP/AWS metadata addresses (`169.254.169.254`, `100.64.0.0/10`, `fc00::/7`, `fe80::/10`, …)
- **Re-validates after every redirect** — Location headers can't bypass the IP check
- **5s total timeout** with `AbortSignal`
- **1 MB response cap** — bytes beyond the limit are discarded and the request fails
- **Max 3 redirects** — each driven manually, not by `fetch`'s automatic follow
- **Content-Type validation** — only `text/html` / `application/xhtml+xml` accepted
- **Regex `<head>` extraction** — no DOM, no scripts run, no parser bugs

Known limitation: Node's native `fetch` doesn't allow per-request DNS pinning, so a DNS-rebinding attacker who controls the upstream resolver could swap IPs between preflight and connect. For high-paranoia setups, swap the fetcher's `node:dns/promises` lookup + `fetch` call for `undici` with a custom `lookup` that re-validates inside the connect callback.

## Branded short URLs

Generate `https://yoursite.com/s/abc1234` redirects backed by Firestore. Works on Vercel (Next.js Route Handler) or Firebase Hosting (rewrite to Cloud Function) — same Cloud Function, just two delivery paths.

### Create a short link

```tsx
'use client';
import { useCreateShortLink } from '@caspian-explorer/script-caspian-share';

export function ShortenButton({ url }: { url: string }) {
  const { create, loading } = useCreateShortLink();
  return (
    <button
      disabled={loading}
      onClick={async () => {
        const { slug } = await create({ url });
        navigator.clipboard.writeText(`https://yoursite.com/s/${slug}`);
      }}
    >
      {loading ? 'Shortening…' : 'Shorten link'}
    </button>
  );
}
```

The user must be signed in via Firebase Auth — the Cloud Function rejects unauthenticated calls. Pass `slug` to request a custom short slug (3–32 chars, `[A-Za-z0-9_-]`); omit it for a 7-char base62 random slug.

### Resolve via Vercel / Next.js

The scaffold drops a Node-runtime route at `app/s/[slug]/route.ts`:

```tsx
import { createShortLinkResolverHandler } from '@caspian-explorer/script-caspian-share/firebase';

const firebaseConfig = { /* ... */ };
export const runtime = 'nodejs';
export const GET = createShortLinkResolverHandler({ config: firebaseConfig });
```

Returns 302 to the target URL, 404 if missing, 410 if expired. Use the `notFoundRedirect` / `expiredRedirect` options to send users to a custom landing page instead.

### Resolve via Firebase Hosting

The scaffold's `firebase.json` rewrites `/s/**` to the `caspianShareResolveShortLink` Cloud Function — which is included in `firebase/functions/src/index.ts`. Deploy:

```bash
firebase deploy --only hosting,functions
```

## Dynamic QR codes

Click-to-reveal QR for any share URL — `qrcode` is an **optional peer dependency**, dynamically imported the first time the button is opened so non-QR consumers pay nothing.

```bash
npm install qrcode
```

```tsx
import { QrCodeButton } from '@caspian-explorer/script-caspian-share';

<QrCodeButton url="https://example.com/post/123" qrSize={300} showLabel />
```

The popover includes the rendered QR, the URL, and a download-as-PNG link. Customize colors and error-correction via `qrOptions`.

For a hookless flow, use `useQrCode(url)` directly — returns `{ dataUrl, loading, error }`.

## Embed code generator

```tsx
import { EmbedCodeGenerator } from '@caspian-explorer/script-caspian-share';

<EmbedCodeGenerator url="https://example.com/widget" title="My Widget" height={500} />
```

Tabs let users pick `iframe` (with safe sandbox attrs), `html` (anchor tag), or `markdown`. One click copies to clipboard.

## Dynamic OG images (Vercel / Cloudflare / Netlify Edge)

Generate per-page Open Graph images that share buttons can preview. The handler is a Web-standard `(Request) => Promise<Response>` so it runs anywhere with an Edge runtime.

`app/api/og/route.tsx`:

```tsx
import { createOgHandler } from '@caspian-explorer/script-caspian-share/og';

export const runtime = 'edge';

export const GET = createOgHandler({
  defaultTitle: 'My Site',
  defaultBrand: 'My Site',
  defaultTheme: 'midnight',
  defaultAccent: '#7c3aed',
});
```

Then build per-page URLs and drop them into your meta tags:

```tsx
import { buildOgImageUrl } from '@caspian-explorer/script-caspian-share/og';

export function generateMetadata({ params }) {
  const ogImage = buildOgImageUrl({
    baseUrl: 'https://example.com/api/og',
    title: 'How we shipped to a million users',
    description: 'Lessons from scaling a side project',
    brand: 'Engineering Blog',
    theme: 'midnight',
    footer: 'example.com/blog',
  });
  return {
    openGraph: { images: [ogImage] },
    twitter: { card: 'summary_large_image', images: [ogImage] },
  };
}
```

**Custom template:** pass any JSX-returning function. The template runs in satori, so flex layout + a CSS subset only.

```tsx
import { createOgHandler } from '@caspian-explorer/script-caspian-share/og';

const MyTemplate = ({ title }: { title: string }) => (
  <div style={{ width: 1200, height: 630, display: 'flex', /* ... */ }}>{title}</div>
);

export const GET = createOgHandler({ template: MyTemplate });
```

`@vercel/og` is an **optional peer dependency** dynamically imported on first request. If it's not installed, the handler returns a clear 500 telling you to `npm install @vercel/og`. Consumers who don't generate OG images pay zero cost.

## i18n

```tsx
<CaspianShareProvider
  locale="ar"
  messages={{ 'dialog.title': 'شارك هذا' }}
  // or for many locales:
  messagesByLocale={{ ar: { 'dialog.title': 'شارك هذا' }, fr: { 'dialog.title': 'Partager' } }}
>
```

RTL languages (`ar`, `he`, `fa`, `ur`) automatically flip dialog and dropdown direction. Resolve translations in your own components with `useT()`.

## Adapter contract

The package needs three host-framework primitives, identical to `script-caspian-store`:

```ts
interface FrameworkAdapters {
  Link: ComponentType<CaspianLinkProps>;            // e.g. next/link
  Image?: ComponentType<CaspianImageProps>;         // e.g. next/image
  useNavigation: () => CaspianNavigation;            // e.g. next/navigation
}
```

Defaults render plain `<a>` and `<img>` and use `window.location` for navigation, so the package works without adapters — but you'll lose SPA transitions and image optimization.

## Custom platforms

Every built-in is the same shape as a custom platform:

```ts
import { CaspianShareProvider, defaultPlatforms } from '@caspian-explorer/script-caspian-share';

const slack = {
  id: 'slack',
  label: 'Slack',
  color: '#4A154B',
  buildShareUrl: ({ url, title }) =>
    `slack://share?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title ?? '')}`,
};

<CaspianShareProvider platforms={[...defaultPlatforms, slack]}>{children}</CaspianShareProvider>
```

Built-in platforms tree-shake — pass only the ones you need to keep the bundle minimal.

## UTM tagging

Configure once at the provider; every share URL is automatically tagged with `utm_source=<platform>`, `utm_medium=share`, plus your campaign defaults. Existing query params are preserved.

```tsx
<CaspianShareProvider utm={{ campaign: 'spring-launch', content: 'top-bar' }}>
  ...
</CaspianShareProvider>
```

## Hosting

This package works identically on **Vercel** and **Firebase Hosting**. From v0.3.0 onwards the scaffold CLI offers route templates for both targets.

## License

MIT
