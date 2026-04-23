import { useCallback } from 'react';
import { useCaspianShareConfig } from '../provider/caspian-share-provider';
import { usePlatformRegistry } from '../provider/platform-registry';
import { useShareAnalytics } from './use-share-analytics';
import { applyUtmTags, platformUtmTags, type UtmTags } from '../services/utm-service';
import type { ShareContext } from '../platforms';

export interface UseShareInput extends Partial<Omit<ShareContext, 'url'>> {
  url?: string;
  utm?: UtmTags;
}

export interface UseShareResult {
  /** Build the platform's share-intent URL without navigating. */
  buildUrl: (platformId: string, overrides?: UseShareInput) => string | null;
  /** Open the share intent in a new tab/window. Returns true if it opened. */
  open: (platformId: string, overrides?: UseShareInput) => boolean;
}

/**
 * Imperative share API. Combines provider defaults, the platform registry, and
 * UTM tagging into a single `open(platformId)` call.
 */
export function useShare(defaults?: UseShareInput): UseShareResult {
  const { defaultUrl, defaultTitle, defaultDescription, utm: defaultUtm, onShare } =
    useCaspianShareConfig();
  const { resolve } = usePlatformRegistry();
  const analytics = useShareAnalytics();

  const resolveContext = useCallback(
    (platformId: string, overrides?: UseShareInput): ShareContext | null => {
      const platform = resolve(platformId);
      if (!platform) return null;
      const merged: UseShareInput = { ...defaults, ...overrides };
      const url =
        merged.url ??
        defaultUrl ??
        (typeof window !== 'undefined' ? window.location.href : '');
      if (!url) return null;
      const tags = platformUtmTags(platformId, { ...defaultUtm, ...merged.utm });
      return {
        url: applyUtmTags(url, tags),
        title: merged.title ?? defaultTitle,
        description: merged.description ?? defaultDescription,
        hashtags: merged.hashtags,
        via: merged.via,
        media: merged.media,
        body: merged.body,
      };
    },
    [defaults, defaultUrl, defaultTitle, defaultDescription, defaultUtm, resolve],
  );

  const buildUrl = useCallback(
    (platformId: string, overrides?: UseShareInput) => {
      const ctx = resolveContext(platformId, overrides);
      if (!ctx) return null;
      const platform = resolve(platformId);
      return platform ? platform.buildShareUrl(ctx) : null;
    },
    [resolveContext, resolve],
  );

  const open = useCallback(
    (platformId: string, overrides?: UseShareInput) => {
      if (typeof window === 'undefined') return false;
      const ctx = resolveContext(platformId, overrides);
      const platform = resolve(platformId);
      if (!ctx || !platform) return false;
      const intentUrl = platform.buildShareUrl(ctx);
      const opened = window.open(intentUrl, '_blank', 'noopener,noreferrer');
      onShare?.({ platformId, url: ctx.url, title: ctx.title });
      analytics.record({ url: ctx.url, platformId, ts: Date.now() });
      return Boolean(opened);
    },
    [resolveContext, resolve, onShare, analytics],
  );

  return { buildUrl, open };
}
