import type { SharePlatform } from './types';

export const pinterestPlatform: SharePlatform = {
  id: 'pinterest',
  label: 'Pinterest',
  color: '#E60023',
  buildShareUrl: ({ url, title, media }) => {
    const params = new URLSearchParams({ url });
    if (media) params.set('media', media);
    if (title) params.set('description', title);
    return `https://pinterest.com/pin/create/button/?${params.toString()}`;
  },
};
