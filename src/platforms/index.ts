import { twitterPlatform } from './twitter';
import { facebookPlatform } from './facebook';
import { linkedinPlatform } from './linkedin';
import { whatsappPlatform } from './whatsapp';
import { telegramPlatform } from './telegram';
import { redditPlatform } from './reddit';
import { pinterestPlatform } from './pinterest';
import { threadsPlatform } from './threads';
import { blueskyPlatform } from './bluesky';
import { mastodonPlatform } from './mastodon';
import { hackerNewsPlatform } from './hacker-news';
import { pocketPlatform } from './pocket';
import { emailPlatform } from './email';
import { smsPlatform } from './sms';

import type { SharePlatform } from './types';

export type { SharePlatform, ShareContext } from './types';

export {
  twitterPlatform,
  facebookPlatform,
  linkedinPlatform,
  whatsappPlatform,
  telegramPlatform,
  redditPlatform,
  pinterestPlatform,
  threadsPlatform,
  blueskyPlatform,
  mastodonPlatform,
  hackerNewsPlatform,
  pocketPlatform,
  emailPlatform,
  smsPlatform,
};

export { createMastodonPlatform } from './mastodon';

/**
 * The default registry — all built-in platforms in suggested display order.
 * Treeshakable: only platforms you reference (or pass to the provider) ship
 * in the consumer bundle.
 */
export const defaultPlatforms: SharePlatform[] = [
  twitterPlatform,
  facebookPlatform,
  linkedinPlatform,
  whatsappPlatform,
  telegramPlatform,
  redditPlatform,
  pinterestPlatform,
  threadsPlatform,
  blueskyPlatform,
  mastodonPlatform,
  hackerNewsPlatform,
  pocketPlatform,
  emailPlatform,
  smsPlatform,
];

export function findPlatform(
  platforms: SharePlatform[],
  id: string,
): SharePlatform | undefined {
  return platforms.find((p) => p.id === id);
}
