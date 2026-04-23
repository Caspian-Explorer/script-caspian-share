import type { SharePlatform } from './types';

export const facebookPlatform: SharePlatform = {
  id: 'facebook',
  label: 'Facebook',
  color: '#1877F2',
  buildShareUrl: ({ url }) => {
    const params = new URLSearchParams({ u: url });
    return `https://www.facebook.com/sharer/sharer.php?${params.toString()}`;
  },
};
