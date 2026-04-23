import type { SharePlatform } from './types';

export const whatsappPlatform: SharePlatform = {
  id: 'whatsapp',
  label: 'WhatsApp',
  color: '#25D366',
  buildShareUrl: ({ url, title }) => {
    const text = title ? `${title} ${url}` : url;
    const params = new URLSearchParams({ text });
    return `https://api.whatsapp.com/send?${params.toString()}`;
  },
};
