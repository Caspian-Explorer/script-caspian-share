// Provider + hooks
export {
  CaspianShareProvider,
  useCaspianShare,
  useCaspianShareConfig,
  useCaspianLink,
  useCaspianImage,
  useCaspianNavigation,
  PlatformRegistryProvider,
  usePlatformRegistry,
  usePlatform,
  usePlatforms,
  CaspianShareFirebaseProvider,
  useCaspianShareFirebase,
} from './provider';
export type {
  CaspianShareProviderProps,
  CaspianShareContextValue,
  CaspianShareConfig,
  PlatformRegistryProviderProps,
  CaspianShareFirebaseProviderProps,
} from './provider';

// Components
export {
  PlatformIcon,
  ShareButton,
  CopyLinkButton,
  NativeShareButton,
  ShareBar,
  ShareDialog,
  ShareMenu,
  ShareCount,
  QrCodeButton,
  EmbedCodeGenerator,
  LinkPreview,
  ShareEventStream,
  Portal,
} from './components';
export type {
  PlatformIconProps,
  ShareButtonProps,
  ShareButtonShape,
  ShareButtonSize,
  ShareButtonVariant,
  CopyLinkButtonProps,
  NativeShareButtonProps,
  ShareBarProps,
  ShareBarLayout,
  ShareBarSidebarSide,
  ShareDialogProps,
  ShareMenuProps,
  ShareCountProps,
  QrCodeButtonProps,
  EmbedCodeGeneratorProps,
  EmbedKind,
  LinkPreviewProps,
  LinkPreviewLayout,
  ShareEventStreamProps,
  PortalProps,
} from './components';

// Hooks
export {
  useClipboard,
  useNativeShare,
  useShareUrl,
  useShare,
  useOutsideClick,
  useEscapeKey,
  useShareCount,
  useShareAnalytics,
  useCreateShortLink,
  useQrCode,
  useOgMetadata,
  useShareEvents,
  useShareCountsDaily,
} from './hooks';
export type {
  UseClipboardOptions,
  UseClipboardResult,
  NativeShareData,
  UseNativeShareResult,
  UseShareUrlInput,
  UseShareInput,
  UseShareResult,
  UseShareCountResult,
  UseShareAnalyticsOptions,
  UseShareAnalyticsResult,
  UseCreateShortLinkResult,
  UseQrCodeOptions,
  UseQrCodeResult,
  UseOgMetadataOptions,
  UseOgMetadataResult,
  UseShareEventsOptions,
  UseShareEventsResult,
  UseShareCountsDailyResult,
} from './hooks';

// Platforms
export {
  defaultPlatforms,
  findPlatform,
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
  createMastodonPlatform,
} from './platforms';
export type { SharePlatform, ShareContext } from './platforms';

// Primitives (adapter contract — same shape as script-caspian-store)
export {
  DefaultCaspianLink,
  DefaultCaspianImage,
  useDefaultCaspianNavigation,
} from './primitives';
export type {
  CaspianLinkProps,
  CaspianLinkComponent,
  CaspianImageProps,
  CaspianImageComponent,
  CaspianNavigation,
  UseCaspianNavigation,
  FrameworkAdapters,
} from './primitives';

// i18n
export {
  LocaleProvider,
  useLocaleContext,
  useT,
  useLocale,
  useDirection,
  DEFAULT_MESSAGES,
} from './i18n';
export type {
  LocaleProviderProps,
  LocaleContextValue,
  MessageKey,
  MessageDict,
} from './i18n';

// Theme
export {
  ThemeProvider,
  useTheme,
  DEFAULT_THEME,
  THEME_PRESETS,
  normalizeTheme,
  resolvePlatformColor,
} from './theme';
export type {
  ThemeProviderProps,
  ThemePresetName,
  ShareTheme,
  NormalizedShareTheme,
} from './theme';

// Services
export { applyUtmTags, platformUtmTags } from './services/utm-service';
export type { UtmTags } from './services/utm-service';

// Utils
export { cn } from './utils/cn';

// Version
export { CASPIAN_SHARE_VERSION } from './version';
