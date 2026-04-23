# Install guide

Install `@caspian-explorer/script-caspian-share` into a React app and get share buttons + (optional) a Firebase backend for counts, short links, OG previews, and detailed analytics in ~15 minutes. Primary target is **Next.js 14 App Router** on **Vercel** or **Firebase Hosting**, but the library works in any React app via the framework-adapter contract.

The fastest path is the [one-command scaffolder](#0-one-command-scaffold). Prefer a manual install? Skip to [§1](#1-install-the-package).

For usage examples (every component, hook, and prop), see [README.md](README.md). This file is the **ops guide** — what to install, how to wire Firebase, how to deploy.

---

## 0. One-command scaffold

```bash
npm create caspian-share@latest my-share-app
cd my-share-app
npm install
cp .env.example .env.local   # fill in Firebase web config (optional)
npm run dev                  # http://localhost:3000
```

This generates a Next.js 14 App Router project with `<CaspianShareProvider>` pre-wired, Next.js adapters (`Link` / `Image` / `useNavigation`), a sample home page using `<ShareBar>` and `<ShareMenu>`, an OG image route at `app/api/og/route.tsx` (Vercel target), a short-link route at `app/s/[slug]/route.ts` (when both Vercel + Firebase chosen), and a complete `firebase/` tree (rules, indexes, functions/) ready to deploy.

**Interactive prompts:**

- Hosting target — Vercel / Firebase / both
- Brand color
- Locale
- Whether to scaffold Cloud Functions + Firestore rules

**Non-interactive flags:**

- `--yes` — accept all defaults, no prompts
- `--hosting=vercel` / `--hosting=firebase` / `--hosting=both` — pick the target
- `--minimal` — skip backend (no Firebase tree, no Cloud Functions, no `<CaspianShareProvider firebaseConfig>`)

```bash
npm create caspian-share@latest my-share-app -- --yes --hosting=vercel
```

**If you used the scaffolder, stop here and follow the generated `my-share-app/README.md`** for Firebase deploy + TTL setup. The remainder of this document (§1–§7) is the manual-install path for embedding the package into an existing app.

If you can't use `npm create` (offline mirror, locked-down network), invoke the scaffolder directly from a clone:

```bash
git clone https://github.com/Caspian-Explorer/script-caspian-share /tmp/scs
node /tmp/scs/scaffold/cli.mjs init my-share-app
```

---

## Manual install

## 1. Install the package

```bash
npm install @caspian-explorer/script-caspian-share
```

Optional peer dependencies — install only what you use:

```bash
npm install firebase           # share counts, short links, OG cache, analytics
npm install @vercel/og         # dynamic OG image generation (Vercel/Edge)
npm install qrcode             # <QrCodeButton>
```

Required peers: React 18 or 19. Next.js consumers: install `next@14` or newer separately.

GitHub-tag install also works as a fallback:

```bash
npm install github:Caspian-Explorer/script-caspian-share#v1.0.0
```

The package's `prepare` script runs `tsup` automatically on install, so you get a usable `dist/` even without a published npm tarball.

---

## 2. Wire the provider

Wrap your app's root layout once. Without `firebaseConfig`, every share UI works — you just don't get persistent counts or short links.

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

If you also use `@caspian-explorer/script-caspian-store`, the same `adapters` object works for both — they share an identical contract.

For full usage — `<ShareBar>`, `<ShareDialog>`, `<ShareMenu>`, theming, custom platforms, server-safe variant — see [README.md](README.md).

---

## 3. (Optional) Stop here

If you only need client-side share buttons (no counts, no short links, no OG previews, no detailed analytics), you're done. Skip §4–§7.

You can route share events to your own analytics by passing `onShare` instead of `firebaseConfig`:

```tsx
<CaspianShareProvider
  onShare={({ platformId, url }) => posthog.capture('share', { platformId, url })}
>
```

---

## 4. Set up Firebase (for counts / short links / OG previews / analytics)

At <https://console.firebase.google.com>:

1. **Create a project.**
2. **Authentication** → Sign-in method → enable Google (or Email/Password). Required for `caspianShareCreateShortLink` and for reading `shareEvents` in detailed-analytics mode.
3. **Firestore Database** → Create database (production mode). Pick the region closest to your users — Functions in §5 inherit it.
4. **Functions** → Upgrade to **Blaze plan**. Required for outbound HTTP from `caspianShareFetchOgMetadata` (it fetches arbitrary OG URLs).

Copy the web-app config (Project settings → Your apps → Web) into `.env.local`:

```
NEXT_PUBLIC_FIREBASE_API_KEY=…
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=…
NEXT_PUBLIC_FIREBASE_PROJECT_ID=…
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=…
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=…
NEXT_PUBLIC_FIREBASE_APP_ID=…
```

Pass it to the provider:

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
  {children}
</CaspianShareProvider>
```

---

## 5. Deploy Cloud Functions

Five functions ship in [firebase/functions/src/index.ts](firebase/functions/src/index.ts):

| Function | Type | Purpose |
|---|---|---|
| `caspianShareRecordEvents` | callable | Writes shards + aggregate; rate-limited (30/min). Optionally writes `shareEvents` in detailed mode. |
| `caspianShareCreateShortLink` | callable | Auth-gated; creates `shortLinks/{slug}` entries. |
| `caspianShareResolveShortLink` | HTTP | Firebase Hosting rewrite target for `/s/**`. |
| `caspianShareFetchOgMetadata` | callable | SSRF-hardened OG fetcher with 24 h Firestore cache. |
| `caspianShareDailyRollup` | trigger (`shareEvents/{id}`) | Materializes `shareCountsDaily/{yyyymmdd}_{urlHash}`. |

Copy the source file into your project's `functions/src/index.ts`, install deps, and deploy:

```bash
cd functions
npm install firebase-admin firebase-functions
npm run build      # tsc
firebase deploy --only functions
```

The scaffolder (§0) generates this directory automatically. For an existing project, copy [firebase/functions/](firebase/functions/) verbatim — it's a self-contained Node 20 project with its own `package.json` and `tsconfig.json`.

---

## 6. Deploy Firestore rules + indexes

Five collections need rules and three need composite indexes:

| Collection | Read | Write |
|---|---|---|
| `shareCounts/**` | public | none (Cloud Function only) |
| `shortLinks/{slug}` | public | none (Cloud Function only) |
| `ogCache/{urlHash}` | public | none (Cloud Function only) |
| `shareEvents/{id}` | auth required | none (Cloud Function only); auto-pruned by TTL |
| `shareCountsDaily/{yyyymmdd_urlHash}` | public | none (Cloud Function only) |

Copy [firebase/firestore.rules](firebase/firestore.rules) and [firebase/firestore.indexes.json](firebase/firestore.indexes.json) into your project root and deploy:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

If you already have a `firestore.rules`, paste the share-related blocks between your existing `match /databases/{database}/documents { ... }`. Reuse helpers like `isAdmin()` if you have them.

### TTL policy on `shareEvents` (detailed analytics mode only)

The library writes `expiresAt = ts + 90 days` on every event. **Without a TTL policy, the events accumulate forever** — Firestore costs scale linearly. Enable auto-pruning in **Firebase Console → Firestore → TTL → Create policy**:

- Collection: `shareEvents`
- Field: `expiresAt`

(Adjust the 90-day window in [firebase/functions/src/index.ts](firebase/functions/src/index.ts) if you want different retention.)

---

## 7. Hosting

The library works identically on Vercel and Firebase Hosting. Pick one or use both.

### Option A — Vercel (recommended for OG image generation)

```bash
vercel deploy
```

The scaffolder generates:

- `app/api/og/route.tsx` — `createOgHandler` from `@caspian-explorer/script-caspian-share/og` (requires `npm install @vercel/og`)
- `app/s/[slug]/route.ts` — Node-runtime route using `createShortLinkResolverHandler` from `@caspian-explorer/script-caspian-share/firebase`
- `vercel.json` — minimal config

OG image route runs on Edge runtime — fast, geo-distributed, perfect for `<meta property="og:image">` tags.

### Option B — Firebase Hosting

```bash
firebase deploy --only hosting,functions
```

The scaffolder's `firebase.json` rewrites `/s/**` to `caspianShareResolveShortLink`. Cloud Functions and Hosting deploy together; the same Firebase project hosts both.

### Option C — Both

Common pattern: serve the app on Vercel (better DX, Edge runtime for OG) but use Firebase Hosting only as the short-link redirector at a separate subdomain (`https://s.example.com/abc1234`). Configure both `vercel.json` and `firebase.json` from the scaffolder; point your domain DNS accordingly.

---

## 8. (Optional) BigQuery export

For long-term analytics warehousing, install the official **Stream Firestore to BigQuery** extension once:

```bash
firebase ext:install firebase/firestore-bigquery-export \
  --params=COLLECTION_PATH=shareEvents,DATASET_ID=caspian_share,TABLE_ID=share_events
```

Then query the materialized view:

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

---

## Gotchas

- **`'firebase' is not installed' errors in bare Node ESM.** Importing the package from a bare `node script.mjs` without `firebase` installed throws `ERR_MODULE_NOT_FOUND` because Node ESM eagerly resolves all top-level imports. Bundlers (Next.js, Vite) tree-shake unused firebase imports cleanly. If you hit this outside a bundler, install the relevant optional peer dep.
- **Edge runtime for OG only.** Don't put the share-link resolver on Edge — it needs Firestore Admin SDK (Node-only). The Vercel scaffold sets `export const runtime = 'nodejs'` on `app/s/[slug]/route.ts` for that reason.
- **Cloud Function cold starts** can hit 1–3 s on the first share of a day. The materialized aggregate at `shareCounts/{urlHash}` keeps `<ShareCount>` reads hot regardless — only writes are affected.
- **Detailed analytics auth.** `shareEvents/{id}` reads require Firebase Auth. If your admin pages aren't behind auth, `<ShareEventStream>` will show empty results — make sure the user is signed in.
- **TTL policy is mandatory for detailed mode.** It's a Firestore Console setting, not a rules file — `firebase deploy` won't create it for you. Skipping it is the #1 unexpected-bill cause for new installs.
- **OG image runtime.** `createOgHandler` lazy-imports `@vercel/og`. If you forget `npm install @vercel/og`, the handler returns 500 with a clear "install @vercel/og" message. Same pattern for `<QrCodeButton>` and `qrcode`.
- **Firebase Storage is not used.** Skip it during the Firebase project setup — the package never touches Storage.
