/**
 * UTM tag config attached to share URLs. All fields optional; only set tags
 * are appended.
 */
export interface UtmTags {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
}

/**
 * Append UTM tags to a URL without clobbering existing query params. If a UTM
 * key is already present in the URL it is left untouched (consumer wins).
 *
 * Returns the original URL string if `url` is not a parseable absolute or
 * root-relative path.
 */
export function applyUtmTags(url: string, tags?: UtmTags): string {
  if (!tags) return url;
  const entries = Object.entries(tags).filter(
    ([, v]) => typeof v === 'string' && v.length > 0,
  ) as [keyof UtmTags, string][];
  if (entries.length === 0) return url;

  // Use a base so we can parse root-relative URLs too.
  let parsed: URL;
  try {
    parsed = new URL(url, 'https://placeholder.invalid');
  } catch {
    return url;
  }

  for (const [key, value] of entries) {
    const utmKey = `utm_${key}`;
    if (!parsed.searchParams.has(utmKey)) {
      parsed.searchParams.set(utmKey, value);
    }
  }

  if (parsed.host === 'placeholder.invalid') {
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  }
  return parsed.toString();
}

/**
 * Build per-platform UTM tags. Sets `utm_source` to the platform id and
 * `utm_medium` to `share` by default; defaults are overridden by `base`.
 */
export function platformUtmTags(platformId: string, base?: UtmTags): UtmTags {
  return {
    source: platformId,
    medium: 'share',
    ...base,
  };
}
