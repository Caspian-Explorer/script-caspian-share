import type { SharePlatform } from './types';

export const emailPlatform: SharePlatform = {
  id: 'email',
  label: 'Email',
  color: '#6B7280',
  buildShareUrl: ({ url, title, body, description }) => {
    const subject = title ?? 'Sharing a link with you';
    const fullBody = body ?? `${description ? description + '\n\n' : ''}${url}`;
    const params = new URLSearchParams({ subject, body: fullBody });
    return `mailto:?${params.toString()}`;
  },
};
