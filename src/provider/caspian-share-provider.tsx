import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { FirebaseOptions } from 'firebase/app';
import {
  DefaultCaspianLink,
  DefaultCaspianImage,
  useDefaultCaspianNavigation,
  type FrameworkAdapters,
  type CaspianLinkComponent,
  type CaspianImageComponent,
  type CaspianNavigation,
} from '../primitives';
import { PlatformRegistryProvider } from './platform-registry';
import { CaspianShareFirebaseProvider } from './firebase-provider';
import { LocaleProvider } from '../i18n/locale-provider';
import { ThemeProvider } from '../theme/theme-provider';
import type { MessageDict } from '../i18n/messages';
import type { ShareTheme } from '../theme/types';
import type { SharePlatform } from '../platforms';
import type { UtmTags } from '../services/utm-service';
import type { ShareAnalyticsMode } from '../firebase/types';

export interface CaspianShareConfig {
  /**
   * Default URL used when a component doesn't pass `url` explicitly. If
   * omitted, components fall back to `window.location.href` at click time.
   */
  defaultUrl?: string;
  /** Default title for share intents. */
  defaultTitle?: string;
  /** Default description (used by email and link previews). */
  defaultDescription?: string;
  /** UTM tags appended to every share URL. Per-platform overrides win. */
  utm?: UtmTags;
  /**
   * Optional analytics sink. Called once per share event. Use this to wire
   * PostHog, GA, Segment, or any custom tracker. Independent of `analytics` —
   * fires even when Firebase backend is enabled.
   */
  onShare?: (event: { platformId: string; url: string; title?: string }) => void;
  /**
   * Firebase analytics mode (requires `firebaseConfig`):
   *   - `counter` (default): only increment the sharded counter — cheapest.
   *   - `detailed`: ALSO write each event to `shareEvents/{id}` so you can
   *     query the per-event stream and the daily roll-ups, and stream them
   *     to BigQuery via the Firebase extension.
   */
  analytics?: ShareAnalyticsMode;
}

export interface CaspianShareProviderProps extends CaspianShareConfig {
  /** Framework Link/Image/useNavigation adapters. Defaults to plain `<a>`/`<img>`. */
  adapters?: Partial<FrameworkAdapters>;
  /** Override the platform registry; defaults to all 14 built-ins. */
  platforms?: SharePlatform[];
  /** BCP-47 locale tag, e.g. `en`, `ar`, `fr-CA`. Default `en`. */
  locale?: string;
  /** Single-locale message overrides. */
  messages?: MessageDict;
  /** Multi-locale message overrides keyed by locale tag. */
  messagesByLocale?: Record<string, MessageDict>;
  /** Visual theme tokens (or one of THEME_PRESETS). */
  theme?: ShareTheme;
  /**
   * Firebase web config — enables share counts, share analytics, and (Phase 5+)
   * short links / OG metadata. Omit to run the package fully stateless.
   */
  firebaseConfig?: FirebaseOptions;
  /** Optional named Firebase app, defaults to `[DEFAULT]`. */
  firebaseAppName?: string;
  /** Cloud Functions region, default `us-central1`. */
  functionsRegion?: string;
  children: ReactNode;
}

export interface CaspianShareContextValue {
  config: CaspianShareConfig;
  adapters: {
    Link: CaspianLinkComponent;
    Image: CaspianImageComponent;
    useNavigation: () => CaspianNavigation;
  };
}

const CaspianShareContext = createContext<CaspianShareContextValue | null>(null);

export function CaspianShareProvider({
  adapters,
  platforms,
  locale,
  messages,
  messagesByLocale,
  theme,
  firebaseConfig,
  firebaseAppName,
  functionsRegion,
  children,
  ...config
}: CaspianShareProviderProps) {
  const value = useMemo<CaspianShareContextValue>(
    () => ({
      config,
      adapters: {
        Link: adapters?.Link ?? DefaultCaspianLink,
        Image: adapters?.Image ?? DefaultCaspianImage,
        useNavigation: adapters?.useNavigation ?? useDefaultCaspianNavigation,
      },
    }),
    // config is spread; depend on each field individually to avoid stale closures
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      adapters?.Link,
      adapters?.Image,
      adapters?.useNavigation,
      config.defaultUrl,
      config.defaultTitle,
      config.defaultDescription,
      config.utm,
      config.onShare,
    ],
  );
  return (
    <CaspianShareContext.Provider value={value}>
      <LocaleProvider locale={locale} messages={messages} messagesByLocale={messagesByLocale}>
        <ThemeProvider theme={theme}>
          <CaspianShareFirebaseProvider
            config={firebaseConfig}
            appName={firebaseAppName}
            functionsRegion={functionsRegion}
          >
            <PlatformRegistryProvider platforms={platforms}>{children}</PlatformRegistryProvider>
          </CaspianShareFirebaseProvider>
        </ThemeProvider>
      </LocaleProvider>
    </CaspianShareContext.Provider>
  );
}

export function useCaspianShare(): CaspianShareContextValue {
  const ctx = useContext(CaspianShareContext);
  if (ctx) return ctx;
  return {
    config: {},
    adapters: {
      Link: DefaultCaspianLink,
      Image: DefaultCaspianImage,
      useNavigation: useDefaultCaspianNavigation,
    },
  };
}

export function useCaspianShareConfig(): CaspianShareConfig {
  return useCaspianShare().config;
}

export function useCaspianLink(): CaspianLinkComponent {
  return useCaspianShare().adapters.Link;
}

export function useCaspianImage(): CaspianImageComponent {
  return useCaspianShare().adapters.Image;
}

export function useCaspianNavigation(): CaspianNavigation {
  return useCaspianShare().adapters.useNavigation();
}
