import type { SharePlatform } from './types';

export const threadsPlatform: SharePlatform = {
  id: 'threads',
  label: 'Threads',
  color: '#000000',
  buildShareUrl: ({ url, title }) => {
    const text = title ? `${title} ${url}` : url;
    const params = new URLSearchParams({ text });
    return `https://www.threads.net/intent/post?${params.toString()}`;
  },
};
