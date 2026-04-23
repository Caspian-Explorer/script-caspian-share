import type { SharePlatform } from './types';

export const blueskyPlatform: SharePlatform = {
  id: 'bluesky',
  label: 'Bluesky',
  color: '#0085FF',
  buildShareUrl: ({ url, title }) => {
    const text = title ? `${title} ${url}` : url;
    const params = new URLSearchParams({ text });
    return `https://bsky.app/intent/compose?${params.toString()}`;
  },
};
