import type { SharePlatform } from './types';

export const redditPlatform: SharePlatform = {
  id: 'reddit',
  label: 'Reddit',
  color: '#FF4500',
  buildShareUrl: ({ url, title }) => {
    const params = new URLSearchParams({ url });
    if (title) params.set('title', title);
    return `https://www.reddit.com/submit?${params.toString()}`;
  },
};
