/**
 * Firestore security rules for the Caspian Share collections. Pasted verbatim
 * into your `firestore.rules` file (or merged with your existing rules).
 *
 * - `shareCounts` (materialized aggregate): publicly readable, **never client-
 *   writable**. Only Cloud Functions update these (via the trigger).
 * - `shareCounts/*\/shards` (sharded counter shards): same — publicly readable,
 *   never client-writable.
 *
 * Clients submit shares via the `caspianShareRecordEvents` callable, which is
 * authorized by App Check + Cloud Function logic — not Firestore rules.
 */
export const CASPIAN_SHARE_FIRESTORE_RULES = `
// === Caspian Share v0.5 ===
match /shareCounts/{urlHash} {
  allow read: if true;
  allow write: if false;

  match /shards/{shardId} {
    allow read: if true;
    allow write: if false;
  }
}

// shortLinks/{slug}: publicly readable for resolution. Writes go through the
// caspianShareCreateShortLink callable (Admin SDK) — clients never write.
match /shortLinks/{slug} {
  allow read: if true;
  allow write: if false;
}

// ogCache/{urlHash}: publicly readable. Writes go through the
// caspianShareFetchOgMetadata callable (Admin SDK + SSRF-hardened fetcher).
match /ogCache/{urlHash} {
  allow read: if true;
  allow write: if false;
}

// shareEvents/{eventId} (detailed analytics mode only): readable by
// authenticated users; writes only via the caspianShareRecordEvents callable.
// Configure a Firestore TTL policy on the 'expiresAt' field (90 days
// recommended) so old events auto-prune.
match /shareEvents/{eventId} {
  allow read: if request.auth != null;
  allow write: if false;
}

// shareCountsDaily/{date_urlHash}: publicly readable daily roll-up,
// materialized by the caspianShareDailyRollup trigger.
match /shareCountsDaily/{dailyId} {
  allow read: if true;
  allow write: if false;
}
`.trim();

/**
 * A complete starter rules file (Firestore rules version 2). Use this when
 * generating a brand-new project — for an existing project, paste
 * `CASPIAN_SHARE_FIRESTORE_RULES` into your existing `match /databases/...`
 * block.
 */
export const CASPIAN_SHARE_RULES_FILE = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
${CASPIAN_SHARE_FIRESTORE_RULES.split('\n').map((l) => `    ${l}`).join('\n')}
  }
}
`;
