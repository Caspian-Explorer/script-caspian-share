import { useCaspianShareConfig } from '../provider/caspian-share-provider';
import { applyUtmTags, platformUtmTags, type UtmTags } from '../services/utm-service';

export interface UseShareUrlInput {
  /** Override the URL being shared. Falls back to provider default, then `window.location.href`. */
  url?: string;
  /** Platform id used to populate `utm_source`. */
  platformId?: string;
  /** Per-call UTM overrides. Wins over provider defaults. */
  utm?: UtmTags;
}

/**
 * Resolve the URL to share, with UTM tags applied. SSR-safe — returns provider
 * default during SSR even if `window` is unavailable.
 */
export function useShareUrl({ url, platformId, utm }: UseShareUrlInput = {}): string {
  const { defaultUrl, utm: defaultUtm } = useCaspianShareConfig();
  const resolved =
    url ??
    defaultUrl ??
    (typeof window !== 'undefined' ? window.location.href : '');
  const tags = platformId ? platformUtmTags(platformId, { ...defaultUtm, ...utm }) : { ...defaultUtm, ...utm };
  return applyUtmTags(resolved, tags);
}
