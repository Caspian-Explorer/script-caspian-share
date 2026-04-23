import type { SharePlatform } from './types';

export const smsPlatform: SharePlatform = {
  id: 'sms',
  label: 'SMS',
  color: '#22C55E',
  buildShareUrl: ({ url, title, body }) => {
    const text = body ?? (title ? `${title} ${url}` : url);
    const params = new URLSearchParams({ body: text });
    return `sms:?${params.toString()}`;
  },
};
