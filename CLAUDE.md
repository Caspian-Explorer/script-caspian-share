# CLAUDE.md

Orientation for AI sessions working on this repo. User-facing setup lives in [README.md](README.md) and [INSTALL.md](INSTALL.md) — don't duplicate it here. Release history lives in [CHANGELOG.md](CHANGELOG.md).

## Project

`@caspian-explorer/script-caspian-share` — a framework-agnostic React share-buttons library published to npm. Installs into any React app (Next.js App Router is the primary target). Ships `<ShareBar>` / `<ShareButton>` / `<ShareDialog>` / `<ShareMenu>` / `<CopyLinkButton>` / `<NativeShareButton>` / `<QrCodeButton>` / `<EmbedCodeGenerator>` / `<ShareCount>` / `<LinkPreview>` / `<ShareEventStream>`, 14 tree-shakable platforms, i18n, theming, and an optional Firestore + Cloud Functions backend for counts, short links, OG cache, and detailed analytics. Consumers provide their own Firebase project (**BYOF**, optional) and/or Vercel deployment.

A turnkey consumer-site scaffolder lives at [scaffold/cli.mjs](scaffold/cli.mjs) — it generates a pre-wired Next.js App Router site. The `npm create caspian-share@latest` entry point lives in the sibling [create-caspian-share/](create-caspian-share/) package, which git-clones this repo and runs the scaffolder.

Sister package to [`@caspian-explorer/script-caspian-store`](https://github.com/Caspian-Explorer/script-caspian-store). The adapter contract (`Link` / `Image` / `useNavigation`) is **identical shape** so a single consumer `adapters` object wires both packages.

## Commands

```bash
npm run dev         # tsup --watch
npm run build       # tsup (ESM + CJS + .d.ts, four entries)
npm run typecheck   # tsc --noEmit
npm run clean       # rimraf dist
```

A `prepare` script also runs `tsup` on `npm install` — this is how `npm install github:Caspian-Explorer/script-caspian-share` produces a usable `dist/` without a separate build step, and it is what runs during `npm publish`. Do not remove it.

**No test runner and no linter are configured.** Do not add Jest/Vitest/Playwright/ESLint/Biome/Prettier without asking the user first.

Cloud Functions under [firebase/functions/](firebase/functions/) are a separate Node 20 project with their own `package.json` and `tsconfig.json`; they are **not** part of the tsup build. Build them from inside that directory (`npm run build` there).

## Architecture

**Four public entries** — must stay in sync with [tsup.config.ts](tsup.config.ts) and the `exports` map in [package.json](package.json):

- `.` → [src/index.ts](src/index.ts) — main client bundle. `'use client'` is prepended **post-build** (tsup strips banner-based directives; only a post-write prepend is reliable — see [tsup.config.ts](tsup.config.ts)).
- `./server` → [src/server/index.ts](src/server/index.ts) — RSC-safe. Pure `<a>` `<ShareBarServer>`, UTM tagger, platform catalog. **Must never emit `'use client'`** or import any client-only module.
- `./firebase` → [src/firebase/index.ts](src/firebase/index.ts) — init, collection refs, sharded counter, short-link resolver, rules/indexes strings, Cloud Function source string. **Node-safe and browser-safe**; consumers import into Server Components and Cloud Functions.
- `./og` → [src/og/index.ts](src/og/index.ts) — runtime-neutral OG image template + handler factory. `createOgHandler` lazy-imports `@vercel/og` so the sub-entry is tree-shakable when unused.

Plus exports: `./styles.css` (side-effect CSS, imported once at app root). The repo-root `firebase/firestore.rules`, `firebase/firestore.indexes.json`, and `firebase/functions/` ship in the tarball (listed in `files`) so consumers can copy them into their project.

### `./firebase` sub-entry: the browser-safe invariant

The `./firebase` barrel is imported into **both** the browser (via `useShareCount` et al.) and Cloud Functions (via the source-string re-export for scaffolding). This means:

- **Never re-export `og-fetcher.ts` from the `./firebase` barrel.** That file imports `node:dns/promises` for SSRF-hardening — pulling it into the browser bundle breaks consumer builds. The barrel has an inline comment marking this exclusion; if you need OG fetching from a Cloud Function, import directly from `src/firebase/og-fetcher.ts` inside the function source, not through the barrel.
- **Keep `node:dns`, `node:dns/promises`, and `undici` in the `external` list** in [tsup.config.ts](tsup.config.ts) so bundlers don't eagerly resolve them.
- `firebase/*` peer-dep subpath imports (`firebase/app`, `firebase/firestore`, `firebase/functions`) are also externals — they must not be bundled.

### Source layout

Grow each directory in place; don't introduce parallel structures:

- [src/provider/](src/provider/) — root provider (`CaspianShareProvider`), platform-registry provider, firebase-app provider
- [src/primitives/](src/primitives/) — framework-adapter contract + defaults (matches store's shape exactly)
- [src/platforms/](src/platforms/) — one file per platform; each exports `{ id, label, color, buildShareUrl }`. Tree-shaken by the registry.
- [src/components/](src/components/) — all UI: `share-bar.tsx`, `share-button.tsx`, `share-dialog.tsx`, `share-menu.tsx`, `native-share-button.tsx`, `copy-link-button.tsx`, `qr-code-button.tsx`, `share-count.tsx`, `link-preview.tsx`, `embed-code-generator.tsx`, `platform-icon.tsx`, `portal.tsx`, `share-event-stream.tsx`
- [src/hooks/](src/hooks/) — `use-share`, `use-share-url`, `use-clipboard`, `use-native-share`, `use-share-count`, `use-share-analytics`, `use-create-short-link`, `use-qr-code`, `use-og-metadata`, `use-share-events`, `use-outside-click`, `use-escape-key`
- [src/services/](src/services/) — `utm-service.ts`, `share-event-service.ts`
- [src/i18n/](src/i18n/) — LocaleProvider, message tables (en default)
- [src/theme/](src/theme/) — theme presets + provider. CSS custom properties (`--caspian-share-*`); no hard-coded colours in components.
- [src/firebase/](src/firebase/) — see browser-safe invariant above
- [src/og/](src/og/) — runtime-neutral OG handler
- [src/server/](src/server/) — RSC-safe re-exports
- [src/utils/](src/utils/) — pure helpers (e.g. [cn.ts](src/utils/cn.ts))
- [src/styles/](src/styles/) — globals.css
- [src/version.ts](src/version.ts) — **auto-generated** by [tsup.config.ts](tsup.config.ts) from the `version` field in package.json on every build. Do not edit by hand.
- [scaffold/cli.mjs](scaffold/cli.mjs) — consumer-site generator (not bundled into the library)

**Provider nesting order** (defined in [src/provider/caspian-share-provider.tsx](src/provider/caspian-share-provider.tsx)) — do not reorder:

```
CaspianShareProvider
  → CaspianShareContext
  → LocaleProvider
  → ThemeProvider
  → CaspianShareFirebaseProvider   (only if firebaseConfig is passed)
  → PlatformRegistryProvider
  → children
```

**Framework-adapter contract** at [src/primitives/types.ts](src/primitives/types.ts): `{ Link, Image?, useNavigation }`. Consumers pass adapters to the provider; defaults in [src/primitives/](src/primitives/) use `<a>`, `<img>`, `window.location`. **No `next/*`, `react-router`, `react-router-dom`, or `@remix-run/*` imports may leak into `src/`.** If you need framework behaviour, extend the adapter contract — don't import directly.

**Platform registry.** Built-in platforms register through the same `registerPlatform({ id, label, color, buildShareUrl })` API a consumer uses — `defaultPlatforms` in [src/platforms/index.ts](src/platforms/index.ts) is just a pre-baked array consumers can pass or replace. Unused platforms tree-shake out. When adding a platform:

1. New file under [src/platforms/](src/platforms/) implementing `PlatformConfig`
2. Append to `defaultPlatforms` export in [src/platforms/index.ts](src/platforms/index.ts)
3. Add i18n label key to [src/i18n/messages.ts](src/i18n/messages.ts) if user-facing
4. Icon handled by [src/components/platform-icon.tsx](src/components/platform-icon.tsx) — add a branch there

**Firestore collection refs** are centralized in [src/firebase/collections.ts](src/firebase/collections.ts). Hooks and services in [src/firebase/](src/firebase/) and [src/hooks/](src/hooks/) consume those refs — **do not call `collection(db, "foo")` ad-hoc**. When adding a collection:

1. Add the ref to [src/firebase/collections.ts](src/firebase/collections.ts)
2. Add access rules to [firebase/firestore.rules](firebase/firestore.rules) **and** update the string mirror in [src/firebase/rules.ts](src/firebase/rules.ts)
3. Add composite indexes to both [firebase/firestore.indexes.json](firebase/firestore.indexes.json) and [src/firebase/indexes.ts](src/firebase/indexes.ts)
4. Update the Cloud Function source string at [src/firebase/cloud-function-source.ts](src/firebase/cloud-function-source.ts) if the function signature changes

The repo-root `firebase/*.rules`/`*.indexes.json` files and the `src/firebase/rules.ts`/`indexes.ts` string mirrors **must stay in sync** — the scaffolder copies the repo-root files, but the string exports are what consumers read at runtime via `CASPIAN_SHARE_FIRESTORE_RULES`. Drift between them is a source of hard-to-diagnose deploy failures.

**Sharded counters.** `shareCounts/{urlHash}` holds a materialized aggregate; 10 child shard docs at `shareCounts/{urlHash}/shards/{0..9}` spread write contention. The Cloud Function callable (`caspianShareRecordEvents`) writes one shard per event in a single Firestore batch and re-aggregates into the parent. Client writes to `shareCounts/*` are **blocked by rules** — everything must flow through the callable. `urlHash` uses cyrb53 on a normalized URL (UTM/fbclid/fragment stripped, default ports dropped, params sorted, host lowercased) — see [src/firebase/url-hash.ts](src/firebase/url-hash.ts).

**Analytics modes.** `<CaspianShareProvider analytics={...}>` accepts `'counter'` (default — sharded counts only) or `'detailed'` (also writes `shareEvents/{id}` docs with `expiresAt`, triggers the daily rollup into `shareCountsDaily/{yyyymmdd}_{urlHash}`). Detailed mode requires a **Firestore TTL policy on `shareEvents.expiresAt`** — the library can't create that for the consumer, so [INSTALL.md](INSTALL.md) documents it.

**SSRF hardening in `fetchOgMetadata`.** The Cloud Function at [firebase/functions/src/index.ts](firebase/functions/src/index.ts) and its source-of-truth at [src/firebase/og-fetcher.ts](src/firebase/og-fetcher.ts) implement: DNS preflight via `node:dns/promises`, HTTPS-only, reject RFC1918/loopback/link-local/CGNAT/IPv6 ULA, 5 s timeout, 1 MB response cap, ≤3 redirects each re-validated, `text/html` content-type check, regex-only `<head>` parser (no DOM), 24 h Firestore cache keyed by `sha256(normalizeUrl(url))`. **Never relax any of these** without the user's explicit permission — the fetcher handles arbitrary consumer-supplied URLs.

**Server Component boundary.** The library emits `"use client"` via post-build prepend in client-heavy files (providers, contexts, interactive components). Consumers mount the provider tree from a Server Component parent; the library *is* the client boundary. The `./server` sub-entry is the RSC-safe escape hatch — use it when the consumer wants a zero-JS share row.

## `create-caspian-share` companion

[create-caspian-share/](create-caspian-share/) is a **separate tiny npm package** (not scoped; published under the personal account) that enables `npm create caspian-share@latest my-app`. It git-clones this repo to a temp dir, spawns [scaffold/cli.mjs](scaffold/cli.mjs) against the user's target directory, then deletes the clone. Three files total: `package.json`, `index.mjs`, `README.md`.

Because the wrapper clones `main`, **consumers always get the latest scaffolder + Firebase artifacts on every invocation**, independent of the main library version. This is why the two packages can ship at different cadences. Bump the companion's `version` only when `index.mjs` itself changes (which is rare — most scaffolder improvements ship through the main repo and are picked up automatically).

## Conventions

- **Strict TypeScript** ([tsconfig.json](tsconfig.json)): `strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`. Path alias `@/*` → `src/*`.
- **Class merging** via [src/utils/cn.ts](src/utils/cn.ts) (`clsx` + `tailwind-merge`). Use it whenever you combine conditional classes.
- **Theming surface** is CSS custom properties (`--caspian-share-primary`, `--caspian-share-accent`, `--caspian-share-radius`, …). Fallbacks in [src/styles/globals.css](src/styles/globals.css); live overrides written by the theme provider. Don't hard-code colours in components.
- **i18n** — user-facing strings go through the i18n layer in [src/i18n/](src/i18n/); don't hard-code English in components. Use `useT()` and add keys to the central message table rather than inlining.
- **Firestore rules** ([firebase/firestore.rules](firebase/firestore.rules)) enforce no-client-write on `shareCounts`, `shortLinks`, `ogCache`, `shareEvents`, `shareCountsDaily`. All writes flow through Cloud Function callables. Reuse helper predicates rather than rewriting auth checks inline.
- **Peer deps** are `react`, `react-dom`, plus optional `firebase`, `@vercel/og`, `qrcode`. Non-optional peers must not be bundled — check `external` in [tsup.config.ts](tsup.config.ts) if you see them in the output. Optional peers (including `qrcode`, `@vercel/og`) use dynamic `await import()` so consumers who don't install them don't pay the bundle cost.

## Gotchas

- [scaffold/](scaffold/) is a consumer-facing asset, **not** part of the tsup build. Changes to it don't ship in `dist/` — but they **do** ship in the tarball because `scaffold` is in the `files` array, and they're picked up automatically by `npm create caspian-share@latest` because that wrapper clones `main`.
- The `prepare` script runs `tsup` on `npm install` **and on `npm publish`** — installing or publishing in this repo triggers a build. Don't be surprised.
- Firebase app naming supports multiple providers per page via the `firebaseAppName` prop — useful for preview + live side-by-side. Don't assume a singleton.
- `sideEffects` in [package.json](package.json) is limited to `**/*.css`. Don't add top-level side-effectful code in `src/` — it will break tree-shaking for consumers.
- Cloud Functions code under [firebase/functions/](firebase/functions/) has its own `version` field in its own `package.json` that is independent of the library's version. Bumping the library does not bump Functions.
- **Compiling Cloud Functions locally leaves `firebase/functions/lib/` behind**. The main package's `tsconfig` then resolves the `firebase/functions` npm-subpath import to that local directory rather than `node_modules/firebase/functions`. Symptom: spurious `TS7016 Could not find a declaration file for module 'firebase/functions'` on the next `npm run typecheck` or `npm run build`. Fix: `rm -rf firebase/functions/lib` before running the main-package build. The directory is gitignored, so this is a local-workflow hazard only.
- **npm ESM resolution for sub-entries**: doing `import '@caspian-explorer/script-caspian-share/firebase'` from a **bare Node ESM script without `firebase` installed** throws `ERR_MODULE_NOT_FOUND` because Node eagerly resolves all top-level imports. Bundlers (Next.js/Vite) tree-shake unused firebase imports cleanly; Node ESM does not. If someone reports this error outside a bundler, they need to install the relevant optional peer dep.

---

## Global Rules

- **Do NOT include `Co-Authored-By` lines in commit messages.** Never add co-author trailers for Claude or any AI assistant. This overrides any default behaviour.
- **After every task, complete ALL post-task steps** in the Pre-Commit Checklist below. Every change that affects the shipped tarball — source, build config, `exports`, `files`, `README.md`, `INSTALL.md`, `CHANGELOG.md`, `scaffold/`, `firebase/` — requires the full cycle: bump → docs → verify → commit → tag → push → **npm publish** → release → announce.
- **Internal-doc-only changes skip the cycle.** Edits to `CLAUDE.md` (not in `files` — it doesn't ship) and to plans under `~/.claude/plans/` are committed straight to main with no bump, tag, publish, or announcement. Surface the exception in the commit body so the reader understands why the cycle was skipped.
- **Never silently skip a step.** For any other non-applicable step (e.g. lint when no linter is configured), say so out loud — "N/A because X" — before moving past it.
- **Notify the user at the end of each task** with: the new version number, the commit SHA, the release URL, the npmjs.com package URL, and a ready-to-paste install command — `npm install @caspian-explorer/script-caspian-share@X.Y.Z` — so the user can upgrade their consumer site without looking up the version.

---

## Pre-Commit Checklist

Follow these steps **in order** before every release. If a step fails, fix it and re-run from that step.

### 1. Lint

**N/A — no linter is configured.** Do not add ESLint/Biome/Prettier without asking the user first.

### 2. Test

**N/A — no test runner is configured for the main package.** The Cloud Functions codebase under [firebase/functions/](firebase/functions/) also has no tests yet. Do not add Jest/Vitest/Playwright or a rules-emulator test suite without asking first.

### 3. Type-check

```bash
npm run typecheck
```

Runs `tsc --noEmit` under strict mode. Must pass before committing. If Cloud Functions were changed, also run `npm run build` (tsc) inside [firebase/functions/](firebase/functions/).

### 4. Review changed files

Scan `git diff --staged` and `git status` for:
- Accidental debug output (`console.log`, `debugger`, `console.warn` added for tracing)
- Leftover `TODO`/`FIXME` comments added in this change
- Hardcoded secrets, Firebase config values, API tokens
- Unused imports or dead code introduced by this change
- `next/*` or router-specific imports leaking into `src/` (see Architecture — adapter contract)
- Ad-hoc `collection(db, "...")` calls outside [src/firebase/collections.ts](src/firebase/collections.ts)
- Hard-coded English strings in components that should go through i18n
- `node:*` or `undici` imports re-exported from the `./firebase` barrel (see browser-safe invariant)

Fix any issues before proceeding.

### 5. Bump version

Increment the version in [package.json](package.json) for every release, following [semver](https://semver.org/):

- **patch** (`1.0.0` → `1.0.1`) — bug fixes, docs, internal refactors with no public API change
- **minor** (`1.0.x` → `1.1.0`) — new features, non-breaking additions to the public export surface (e.g. new platform, new component, new hook)
- **major** (`1.x.x` → `2.0.0`) — breaking changes: renaming/removing public exports, changing provider props, requiring consumer code changes

`src/version.ts` is regenerated automatically by tsup from `package.json` — do not edit it by hand.

Then update [CHANGELOG.md](CHANGELOG.md): add a new `## vX.Y.Z — <short summary>` heading above the previous version, following [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) sections (`### Added`, `### Changed`, `### Fixed`, `### Removed`).

**Upgrade-notes heading is required.** Every entry must include *exactly one* of these two headings so customers can tell at a glance whether the release needs action:

- `### Consumer action required on upgrade` — followed by a fenced bash block of exact commands, or a numbered list of the steps.
- `### No consumer action required` — followed by a one-line explanation.

Never omit the heading, rename it, or fold it into `### Notes`.

**If `create-caspian-share/index.mjs` changed** — bump [create-caspian-share/package.json](create-caspian-share/package.json) independently. Its version tracks the wrapper's own semver, not the main library's. In most releases this file is untouched and no bump is needed.

### 6. Update documentation

Update **all** documentation affected by the changes. Only skip if the file clearly doesn't touch what changed.

- [README.md](README.md) — user-facing overview, usage examples, current feature set, phase table
- [INSTALL.md](INSTALL.md) — consumer setup (scaffolder + manual install), Firebase deployment, TTL policy, BigQuery export docs
- [CHANGELOG.md](CHANGELOG.md) — covered in step 5
- [CLAUDE.md](CLAUDE.md) — this file, if an architecture invariant, convention, or workflow rule shifted
- `description` field in [package.json](package.json) — if the project's scope changed
- [scaffold/cli.mjs](scaffold/cli.mjs) generated README template — if the public API or provider props changed

**Wiki: N/A — no GitHub Wiki exists for this repo.** If one is created later, clone `https://github.com/Caspian-Explorer/script-caspian-share.wiki.git` and edit affected pages there.

### 7. Build

```bash
npm run build    # tsup: dist/index, dist/server, dist/firebase, dist/og (ESM + CJS + .d.ts each)
npm pack         # produces caspian-explorer-script-caspian-share-X.Y.Z.tgz
```

Both must complete without errors. Keep the `.tgz` locally for the GitHub Release step — it is gitignored via `*.tgz`.

If `create-caspian-share/` was bumped, also:

```bash
cd create-caspian-share && npm pack --dry-run
```

Confirm the tarball contains only `index.mjs`, `README.md`, `package.json`.

### 8. Commit

Create a commit with a descriptive message in imperative mood ("Add X" not "Added X"). Body explains the *why*, not the *what*. **Never include `Co-Authored-By` trailers.**

Use a heredoc for multi-line messages to preserve formatting:

```bash
git commit -m "$(cat <<'EOF'
Short one-line summary under 72 chars

Paragraph explaining the why. Reference the problem this solves, the
constraint that forced the approach, or the incident that prompted it.
Do not narrate the diff.
EOF
)"
```

### 9. Tag

```bash
git tag -a vX.Y.Z -m "vX.Y.Z — <short summary>"
```

Always annotated (`-a`), never lightweight. The tag message should be a one-line summary suitable as the release title.

If `create-caspian-share/` was bumped, also tag it:

```bash
git tag -a create-caspian-share-vX.Y.Z -m "create-caspian-share vX.Y.Z — <short summary>"
```

Prefix-tagging keeps the companion's version history distinct from the main library's.

### 10. Push

```bash
git push origin main --tags
```

Pushes the commit and all new tags in one operation. Never force-push to `main`.

### 11. Publish to npmjs.com

This is the **load-bearing distribution step** — unlike the sister `script-caspian-store` (which ships via GitHub tag), this package is designed for `npm install @caspian-explorer/script-caspian-share` as the primary path. Skipping publish means no consumer sees the release.

```bash
# Main library
npm publish --access public
```

The `prepare` script re-runs `tsup` during publish, so you don't need to rebuild first — but a stale `dist/` from before the version bump will land in the tarball if you skip step 7. Always run build + pack first so the tarball you verify locally is byte-identical to what goes to the registry.

Gate: **requires the user to be logged into npm with publish access to the `@caspian-explorer` org.** If `npm whoami` fails or returns a user without org membership, stop and surface the problem to the user — don't try to rename the scope or publish under a personal account.

If `create-caspian-share/` was bumped, publish it too (personal account, no scope):

```bash
cd create-caspian-share
npm publish --access public
cd ..
```

Verify both on npmjs.com:
- https://www.npmjs.com/package/@caspian-explorer/script-caspian-share
- https://www.npmjs.com/package/create-caspian-share

### 12. Create GitHub Release

```bash
gh release create vX.Y.Z caspian-explorer-script-caspian-share-X.Y.Z.tgz \
  --title "vX.Y.Z — <short summary>" \
  --notes "$(cat <<'EOF'
<changelog entries for this version, copied from CHANGELOG.md>
EOF
)"
```

Attach the `.tgz` from step 7. This gives GitHub-tag installers (`npm install github:Caspian-Explorer/script-caspian-share#vX.Y.Z`) a fallback even when the npm registry is slow to refresh.

### 13. Post to GitHub Discussions

After every release, create a Discussion in the **Announcements** category. The post must be **social-media-ready** — the user should be able to copy-paste it to Twitter/X, LinkedIn, or a dev blog without edits.

**Format requirements:**
- **Title** — action-oriented, under 100 characters (e.g. `script-caspian-share 1.1 — QR codes + link previews`)
- **Body** — 1–3 sentence intro; 2–4 highlight bullets; install one-liner (`npm install @caspian-explorer/script-caspian-share@X.Y.Z`); repo link `https://github.com/Caspian-Explorer/script-caspian-share` and npm link.

**Create via GraphQL API:**

```bash
gh api graphql -F query=@- <<'EOF'
mutation {
  createDiscussion(input: {
    repositoryId: "<REPO_NODE_ID>",
    categoryId: "<ANNOUNCEMENTS_CATEGORY_NODE_ID>",
    title: "<TITLE>",
    body: "<BODY>"
  }) {
    discussion { url }
  }
}
EOF
```

**One-time lookup** for `<REPO_NODE_ID>` and `<ANNOUNCEMENTS_CATEGORY_NODE_ID>`:

```bash
gh api graphql -f query='
  query {
    repository(owner: "Caspian-Explorer", name: "script-caspian-share") {
      id
      discussionCategories(first: 20) { nodes { id name } }
    }
  }
'
```

Copy the repo `id` and the category `id` whose `name` is `Announcements` back into this file, replacing the placeholders above, so future releases skip the lookup.

---

## Style guide

In addition to the Conventions section above:

- Commit messages: imperative mood ("Fix X", "Add Y"). First line ≤ 72 chars. Body explains *why*.
- Don't add comments that restate what well-named code already says. Only comment *why* something is non-obvious.
- Don't add error handling for conditions that can't happen. Validate at system boundaries only.
- Don't introduce new abstractions for hypothetical future needs.
- Delete unused code outright rather than commenting it out or leaving `// removed` breadcrumbs.

---

## Never do without explicit user permission

- Force-push to `main`
- `git reset --hard` on a branch that has unpushed work
- Delete branches other than short-lived local ones you created in this session
- **`npm unpublish`** (essentially irreversible within the 72-hour window, and blocked after)
- **`npm deprecate`** for an existing published version
- Rename the package or change its scope — consumers would have to rewrite imports
- Modify the remote repository's settings, branch protections, or secrets
- Commit with `--no-verify` or equivalent hook-bypass flags
- Add a `Co-Authored-By` trailer to any commit

`npm publish` is **part of the default release flow** (see step 11) — it does not require re-asking per release, but it *does* require that the user is logged in as a member of `@caspian-explorer`. If auth fails, stop and report; never try to work around it by switching scopes.
