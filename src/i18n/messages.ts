/**
 * Default English messages. Consumers override entries via the provider's
 * `messages` (single locale) or `messagesByLocale` (multi-locale) prop.
 *
 * Keys are namespaced as `area.label`. Use `useT()` to resolve them.
 */
export const DEFAULT_MESSAGES = {
  // Buttons
  'button.share': 'Share',
  'button.copyLink': 'Copy link',
  'button.copied': 'Copied!',
  'button.close': 'Close',
  'button.cancel': 'Cancel',
  'button.send': 'Send',

  // Dialog
  'dialog.title': 'Share this',
  'dialog.urlLabel': 'Link',
  'dialog.messageLabel': 'Add a message (optional)',
  'dialog.messagePlaceholder': "Say something about what you're sharing…",
  'dialog.platformsHeading': 'Share to',
  'dialog.copyHeading': 'Copy or scan',

  // Bar
  'bar.label': 'Share this page',

  // Menu
  'menu.openLabel': 'Share menu',

  // Native
  'native.label': 'Share',
  'native.unavailable': 'Native sharing unavailable on this device',

  // Errors
  'error.copyFailed': 'Could not copy to clipboard',
  'error.shareFailed': 'Could not open share sheet',
} as const;

export type MessageKey = keyof typeof DEFAULT_MESSAGES;
export type MessageDict = Partial<Record<MessageKey, string>>;
