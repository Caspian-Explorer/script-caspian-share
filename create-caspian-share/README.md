# create-caspian-share

One-command scaffolder for [`@caspian-explorer/script-caspian-share`](https://www.npmjs.com/package/@caspian-explorer/script-caspian-share).

## Usage

```bash
npm create caspian-share@latest my-share-app
```

Interactive prompts let you pick the hosting target (Vercel / Firebase / both), brand color, locale, and whether to scaffold the Cloud Function + Firestore rules.

### Non-interactive

```bash
npm create caspian-share@latest my-share-app -- --yes --hosting=vercel
```

### What it generates

A fresh Next.js 14 App Router project pre-wired to `<CaspianShareProvider>`:

- `app/layout.tsx` + `app/_components/share-adapter.tsx` (next/link + next/image + next/navigation adapters)
- Sample home page using `<ShareBar>` and `<ShareMenu>`
- `app/api/og/route.tsx` (Vercel `@vercel/og` handler) when Vercel target is enabled
- `app/s/[slug]/route.ts` (short-link resolver) when Vercel + Firebase both enabled
- `firebase.json` with hosting rewrites + Firestore rules + functions config when Firebase target is enabled
- `firestore.rules` + `firestore.indexes.json` for share counts, short links, OG cache, event log
- `functions/` directory ready for `caspianShareRecordEvents`, `caspianShareCreateShortLink`, `caspianShareResolveShortLink`, `caspianShareFetchOgMetadata`, and `caspianShareDailyRollup`

### How it works

Clones [Caspian-Explorer/script-caspian-share](https://github.com/Caspian-Explorer/script-caspian-share) on `main` (shallow), runs the in-tree scaffolder against your chosen directory, then deletes the clone. You always get the latest scaffolder, rules, and Cloud Function source on every invocation.

## License

MIT
