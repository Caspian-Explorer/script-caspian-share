import type { SharePlatform } from './types';

export const twitterPlatform: SharePlatform = {
  id: 'twitter',
  label: 'X (Twitter)',
  color: '#000000',
  buildShareUrl: ({ url, title, hashtags, via }) => {
    const params = new URLSearchParams({ url });
    if (title) params.set('text', title);
    if (hashtags?.length) params.set('hashtags', hashtags.join(','));
    if (via) params.set('via', via);
    return `https://twitter.com/intent/tweet?${params.toString()}`;
  },
};
