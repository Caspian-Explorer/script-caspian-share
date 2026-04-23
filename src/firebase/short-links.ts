import {
  collection,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  type CollectionReference,
  type DocumentReference,
  type Firestore,
} from 'firebase/firestore';
import { SHORT_LINK_SLUG_LENGTH, type ShortLinkDoc } from './types';

const SHORT_LINKS_COLLECTION = 'shortLinks';
const BASE62 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const SLUG_PATTERN = /^[A-Za-z0-9_-]{3,32}$/;

export function shortLinksCollection(db: Firestore): CollectionReference<ShortLinkDoc> {
  return collection(db, SHORT_LINKS_COLLECTION) as CollectionReference<ShortLinkDoc>;
}

export function shortLinkDoc(db: Firestore, slug: string): DocumentReference<ShortLinkDoc> {
  return doc(db, SHORT_LINKS_COLLECTION, slug) as DocumentReference<ShortLinkDoc>;
}

/**
 * Generate a random base62 slug. Crypto-quality randomness when Web Crypto is
 * available; falls back to `Math.random` otherwise.
 */
export function generateSlug(length: number = SHORT_LINK_SLUG_LENGTH): string {
  const chars = new Array(length);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < length; i++) chars[i] = BASE62[bytes[i] % BASE62.length];
  } else {
    for (let i = 0; i < length; i++) chars[i] = BASE62[Math.floor(Math.random() * BASE62.length)];
  }
  return chars.join('');
}

/** Validate a slug. Used by client + server to guard against bad input. */
export function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug);
}

/**
 * Resolve a slug to its target URL. Returns null if not found or expired.
 * Pure read — works against the client SDK or any Firestore that exposes the
 * same `getDoc` shape (the admin SDK does not, so use admin separately on
 * Cloud Functions).
 */
export async function resolveShortLink(
  db: Firestore,
  slug: string,
): Promise<{ url: string; doc: ShortLinkDoc } | null> {
  if (!isValidSlug(slug)) return null;
  const snap = await getDoc(shortLinkDoc(db, slug));
  if (!snap.exists()) return null;
  const data = snap.data() as ShortLinkDoc;
  if (data.expiresAt && Date.now() > data.expiresAt) return null;
  return { url: data.url, doc: data };
}

/**
 * Client-side write — used only when the consumer has authenticated as an
 * admin and Firestore rules permit. For untrusted clients, prefer the
 * `caspianShareCreateShortLink` Cloud Function callable via `useCreateShortLink`.
 */
export async function writeShortLink(
  db: Firestore,
  input: { slug: string; url: string; createdBy?: string; expiresAt?: number },
): Promise<void> {
  if (!isValidSlug(input.slug)) {
    throw new Error(`Invalid slug "${input.slug}" — must match ${SLUG_PATTERN}`);
  }
  await setDoc(shortLinkDoc(db, input.slug), {
    slug: input.slug,
    url: input.url,
    createdAt: Date.now(),
    createdBy: input.createdBy,
    expiresAt: input.expiresAt,
    hits: 0,
    // serverTimestamp is preferred for consistent ordering when many writers
    // race; Date.now() above gives a useful client-visible default too.
    _serverCreatedAt: serverTimestamp(),
  } as ShortLinkDoc & { _serverCreatedAt: unknown });
}
