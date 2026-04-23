import type { OgTemplateProps } from './template';

export interface BuildOgImageUrlInput
  extends Pick<OgTemplateProps, 'title' | 'description' | 'brand' | 'theme' | 'accent' | 'footer'> {
  /**
   * Origin + path of the OG endpoint, e.g. `https://example.com/api/og` or
   * `/api/og` for relative URLs in `<meta property="og:image">` tags rendered
   * server-side.
   */
  baseUrl: string;
}

/**
 * Build a fully-qualified OG image URL with template params encoded as query
 * string. The result is safe to drop straight into `<meta property="og:image">`
 * or `<meta name="twitter:image">`.
 *
 * Existing query params on `baseUrl` are preserved.
 */
export function buildOgImageUrl({
  baseUrl,
  title,
  description,
  brand,
  theme,
  accent,
  footer,
}: BuildOgImageUrlInput): string {
  let parsed: URL;
  try {
    parsed = new URL(baseUrl, 'https://placeholder.invalid');
  } catch {
    return baseUrl;
  }

  if (title) parsed.searchParams.set('title', title);
  if (description) parsed.searchParams.set('description', description);
  if (brand) parsed.searchParams.set('brand', brand);
  if (theme) parsed.searchParams.set('theme', theme);
  if (accent) parsed.searchParams.set('accent', accent);
  if (footer) parsed.searchParams.set('footer', footer);

  if (parsed.host === 'placeholder.invalid') {
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  }
  return parsed.toString();
}
