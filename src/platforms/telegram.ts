import type { SharePlatform } from './types';

export const telegramPlatform: SharePlatform = {
  id: 'telegram',
  label: 'Telegram',
  color: '#26A5E4',
  buildShareUrl: ({ url, title }) => {
    const params = new URLSearchParams({ url });
    if (title) params.set('text', title);
    return `https://t.me/share/url?${params.toString()}`;
  },
};
