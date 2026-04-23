import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { DEFAULT_MESSAGES, type MessageDict, type MessageKey } from './messages';

export interface LocaleContextValue {
  /** BCP-47 tag, e.g. `en`, `en-US`, `ar`, `fr-CA`. */
  locale: string;
  /** Resolve a message key to its translated string. */
  t: (key: MessageKey, fallback?: string) => string;
  /** True if the active locale is RTL (ar, he, fa, ur). */
  rtl: boolean;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

const RTL_LOCALES = new Set(['ar', 'he', 'fa', 'ur']);

export interface LocaleProviderProps {
  locale?: string;
  /** Single-locale message overrides. Wins over `messagesByLocale`. */
  messages?: MessageDict;
  /** Multi-locale message overrides keyed by locale tag. */
  messagesByLocale?: Record<string, MessageDict>;
  children: ReactNode;
}

export function LocaleProvider({
  locale = 'en',
  messages,
  messagesByLocale,
  children,
}: LocaleProviderProps) {
  const value = useMemo<LocaleContextValue>(() => {
    const langOnly = locale.split('-')[0]?.toLowerCase() ?? 'en';
    const overrides: MessageDict = {
      ...(messagesByLocale?.[langOnly] ?? {}),
      ...(messagesByLocale?.[locale] ?? {}),
      ...(messages ?? {}),
    };
    return {
      locale,
      rtl: RTL_LOCALES.has(langOnly),
      t: (key: MessageKey, fallback?: string) => {
        return overrides[key] ?? DEFAULT_MESSAGES[key] ?? fallback ?? key;
      },
    };
  }, [locale, messages, messagesByLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocaleContext(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (ctx) return ctx;
  return {
    locale: 'en',
    rtl: false,
    t: (key, fallback) => DEFAULT_MESSAGES[key] ?? fallback ?? key,
  };
}

export function useT(): LocaleContextValue['t'] {
  return useLocaleContext().t;
}

export function useLocale(): string {
  return useLocaleContext().locale;
}

export function useDirection(): 'ltr' | 'rtl' {
  return useLocaleContext().rtl ? 'rtl' : 'ltr';
}
