import { useCallback, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { useCaspianShareFirebase } from '../provider/firebase-provider';
import type { CreateShortLinkRequest, CreateShortLinkResponse } from '../firebase/types';

export interface UseCreateShortLinkResult {
  /** Calls the `caspianShareCreateShortLink` callable. Throws on backend errors. */
  create: (input: CreateShortLinkRequest) => Promise<CreateShortLinkResponse>;
  /** True while the most recent call is in flight. */
  loading: boolean;
  error: Error | null;
  /** True when Firebase is configured. */
  enabled: boolean;
}

/**
 * Create a short link via the Cloud Function callable. Requires the user to be
 * signed in via Firebase Auth (the function rejects unauthenticated calls).
 *
 * Returns `enabled: false` when no `firebaseConfig` was passed to the provider;
 * `create` will throw in that case.
 */
export function useCreateShortLink(): UseCreateShortLinkResult {
  const firebase = useCaspianShareFirebase();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const create = useCallback(
    async (input: CreateShortLinkRequest): Promise<CreateShortLinkResponse> => {
      if (!firebase) throw new Error('Firebase not configured on CaspianShareProvider');
      setLoading(true);
      setError(null);
      try {
        const callable = httpsCallable<CreateShortLinkRequest, CreateShortLinkResponse>(
          firebase.functions,
          'caspianShareCreateShortLink',
        );
        const result = await callable(input);
        return result.data;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [firebase],
  );

  return { create, loading, error, enabled: Boolean(firebase) };
}
