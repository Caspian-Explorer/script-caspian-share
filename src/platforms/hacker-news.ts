import type { SharePlatform } from './types';

export const hackerNewsPlatform: SharePlatform = {
  id: 'hacker-news',
  label: 'Hacker News',
  color: '#FF6600',
  buildShareUrl: ({ url, title }) => {
    const params = new URLSearchParams({ u: url });
    if (title) params.set('t', title);
    return `https://news.ycombinator.com/submitlink?${params.toString()}`;
  },
};
