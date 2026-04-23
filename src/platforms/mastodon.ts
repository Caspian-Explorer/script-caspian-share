import type { SharePlatform } from './types';

const DEFAULT_INSTANCE = 'https://mastodon.social';

/**
 * Build a Mastodon share platform pinned to a specific instance. Pass to the
 * provider or component to override the default `mastodon.social` instance.
 *
 *   const myMastodon = createMastodonPlatform('https://hachyderm.io');
 *   <CaspianShareProvider platforms={[...defaultPlatforms, myMastodon]}>
 */
export function createMastodonPlatform(instance = DEFAULT_INSTANCE): SharePlatform {
  const baseUrl = instance.replace(/\/$/, '');
  return {
    id: 'mastodon',
    label: 'Mastodon',
    color: '#6364FF',
    buildShareUrl: ({ url, title }) => {
      const text = title ? `${title} ${url}` : url;
      const params = new URLSearchParams({ text });
      return `${baseUrl}/share?${params.toString()}`;
    },
  };
}

export const mastodonPlatform: SharePlatform = createMastodonPlatform();
