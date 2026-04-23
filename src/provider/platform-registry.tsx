import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { defaultPlatforms, findPlatform, type SharePlatform } from '../platforms';

interface PlatformRegistryValue {
  platforms: SharePlatform[];
  resolve: (id: string) => SharePlatform | undefined;
}

const PlatformRegistryContext = createContext<PlatformRegistryValue | null>(null);

export interface PlatformRegistryProviderProps {
  /**
   * Override the platform list. If omitted, all 14 built-in platforms are
   * registered. Pass an array to add custom platforms or restrict the set:
   *
   *   platforms={[twitterPlatform, blueskyPlatform, myCustomPlatform]}
   */
  platforms?: SharePlatform[];
  children: ReactNode;
}

export function PlatformRegistryProvider({
  platforms,
  children,
}: PlatformRegistryProviderProps) {
  const value = useMemo<PlatformRegistryValue>(() => {
    const list = platforms ?? defaultPlatforms;
    return {
      platforms: list,
      resolve: (id: string) => findPlatform(list, id),
    };
  }, [platforms]);
  return (
    <PlatformRegistryContext.Provider value={value}>
      {children}
    </PlatformRegistryContext.Provider>
  );
}

export function usePlatformRegistry(): PlatformRegistryValue {
  const ctx = useContext(PlatformRegistryContext);
  if (!ctx) {
    return {
      platforms: defaultPlatforms,
      resolve: (id: string) => findPlatform(defaultPlatforms, id),
    };
  }
  return ctx;
}

export function usePlatform(id: string): SharePlatform | undefined {
  return usePlatformRegistry().resolve(id);
}

export function usePlatforms(ids?: string[]): SharePlatform[] {
  const { platforms, resolve } = usePlatformRegistry();
  if (!ids) return platforms;
  return ids.map((id) => resolve(id)).filter((p): p is SharePlatform => Boolean(p));
}
