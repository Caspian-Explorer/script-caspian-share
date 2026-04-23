import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { FirebaseOptions } from 'firebase/app';
import { initCaspianShareFirebase, type CaspianShareFirebase } from '../firebase/client';

const FirebaseContext = createContext<CaspianShareFirebase | null>(null);

export interface CaspianShareFirebaseProviderProps {
  /** Firebase web config object. Mounting without this prop is a no-op. */
  config?: FirebaseOptions;
  /** Optional named app, lets multiple Firebase apps coexist. */
  appName?: string;
  /** Cloud Functions region, default `us-central1`. */
  functionsRegion?: string;
  children: ReactNode;
}

/**
 * Internal provider that initializes Firebase once when `config` is supplied.
 * Mounted automatically by `CaspianShareProvider` when its `firebaseConfig`
 * prop is set; usually you don't render this directly.
 */
export function CaspianShareFirebaseProvider({
  config,
  appName,
  functionsRegion,
  children,
}: CaspianShareFirebaseProviderProps) {
  const value = useMemo(() => {
    if (!config) return null;
    return initCaspianShareFirebase({ config, appName, functionsRegion });
  }, [config, appName, functionsRegion]);
  return <FirebaseContext.Provider value={value}>{children}</FirebaseContext.Provider>;
}

/**
 * Returns the active Firebase context, or `null` if `firebaseConfig` was not
 * passed to `CaspianShareProvider`. Hooks should treat `null` as "backend
 * disabled" and degrade silently.
 */
export function useCaspianShareFirebase(): CaspianShareFirebase | null {
  return useContext(FirebaseContext);
}
