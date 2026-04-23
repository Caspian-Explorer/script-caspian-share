import type { FirebaseOptions } from 'firebase/app';
import { initCaspianShareFirebase } from './client';
import { resolveShortLink, isValidSlug } from './short-links';

export interface ShortLinkResolverOptions {
  config: FirebaseOptions;
  appName?: string;
  /** URL pattern to extract the slug from. Default: last path segment. */
  extractSlug?: (request: Request) => string | null;
  /** URL to redirect to when the slug doesn't exist. Default: returns 404 plain text. */
  notFoundRedirect?: string;
  /** URL to redirect to when the slug has expired. Default: returns 410 plain text. */
  expiredRedirect?: string;
  /** HTTP status for redirects. Default 302. */
  redirectStatus?: 301 | 302 | 307 | 308;
}

export type ShortLinkResolverHandler = (request: Request) => Promise<Response>;

const defaultExtractor = (request: Request): string | null => {
  const segments = new URL(request.url).pathname.split('/').filter(Boolean);
  return segments[segments.length - 1] ?? null;
};

/**
 * Build a Web-standard `(Request) => Promise<Response>` handler that resolves
 * a short-link slug to its target URL and returns a redirect.
 *
 *   // app/s/[slug]/route.ts
 *   import { createShortLinkResolverHandler } from '@caspian-explorer/script-caspian-share/firebase';
 *   export const runtime = 'nodejs'; // (Edge requires extra setup for Firestore)
 *   export const GET = createShortLinkResolverHandler({
 *     config: { apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!, ... },
 *   });
 *
 * For Firebase Hosting with rewrites, deploy the
 * `caspianShareResolveShortLink` Cloud Function instead — same logic, runs
 * inside Firebase.
 */
export function createShortLinkResolverHandler(
  options: ShortLinkResolverOptions,
): ShortLinkResolverHandler {
  const {
    config,
    appName,
    extractSlug = defaultExtractor,
    notFoundRedirect,
    expiredRedirect,
    redirectStatus = 302,
  } = options;

  return async function shortLinkHandler(request: Request): Promise<Response> {
    const slug = extractSlug(request);
    if (!slug || !isValidSlug(slug)) {
      return notFoundRedirect
        ? Response.redirect(notFoundRedirect, redirectStatus)
        : new Response('Invalid short link', { status: 400 });
    }

    const { db } = initCaspianShareFirebase({ config, appName });
    const result = await resolveShortLink(db, slug);

    if (!result) {
      return notFoundRedirect
        ? Response.redirect(notFoundRedirect, redirectStatus)
        : new Response('Short link not found', { status: 404 });
    }
    if (result.doc.expiresAt && Date.now() > result.doc.expiresAt) {
      return expiredRedirect
        ? Response.redirect(expiredRedirect, redirectStatus)
        : new Response('Short link expired', { status: 410 });
    }

    return Response.redirect(result.url, redirectStatus);
  };
}
