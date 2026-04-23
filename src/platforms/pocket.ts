import type { SharePlatform } from './types';

export const pocketPlatform: SharePlatform = {
  id: 'pocket',
  label: 'Pocket',
  color: '#EF4056',
  buildShareUrl: ({ url, title }) => {
    const params = new URLSearchParams({ url });
    if (title) params.set('title', title);
    return `https://getpocket.com/edit?${params.toString()}`;
  },
};
