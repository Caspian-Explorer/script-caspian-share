import type { SharePlatform } from './types';

export const linkedinPlatform: SharePlatform = {
  id: 'linkedin',
  label: 'LinkedIn',
  color: '#0A66C2',
  buildShareUrl: ({ url }) => {
    const params = new URLSearchParams({ url });
    return `https://www.linkedin.com/sharing/share-offsite/?${params.toString()}`;
  },
};
