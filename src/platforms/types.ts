/**
 * Context passed to a platform's `buildShareUrl`. All fields except `url` are
 * optional; platforms that don't use a field simply ignore it.
 */
export interface ShareContext {
  /** Absolute URL being shared. */
  url: string;
  /** Page or content title. */
  title?: string;
  /** Long-form description (some platforms ignore). */
  description?: string;
  /** Hashtag slugs without the `#` prefix. */
  hashtags?: string[];
  /** Twitter/X handle for `via=` (without `@`). */
  via?: string;
  /** Image URL for platforms that accept media (Pinterest). */
  media?: string;
  /** Plain-text body for email/SMS. */
  body?: string;
}

/**
 * A registrable share platform. Built-ins use the same shape as third-party
 * platforms registered via the provider.
 */
export interface SharePlatform {
  /** Stable slug, e.g. `twitter`, `bluesky`. */
  id: string;
  /** Human-readable label for buttons + a11y. */
  label: string;
  /** Brand hex color (used for button accents). */
  color: string;
  /** Returns the full share-intent URL for this platform. */
  buildShareUrl: (ctx: ShareContext) => string;
}
