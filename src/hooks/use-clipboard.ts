import { useCallback, useState } from 'react';

export interface UseClipboardOptions {
  /** Reset `copied` state back to false after this many ms. Default 2000. */
  resetMs?: number;
}

export interface UseClipboardResult {
  copy: (text: string) => Promise<boolean>;
  copied: boolean;
  error: Error | null;
}

/**
 * Copy text to the clipboard. Falls back to `document.execCommand('copy')` for
 * browsers that don't expose `navigator.clipboard` (e.g. older Safari over HTTP).
 */
export function useClipboard({ resetMs = 2000 }: UseClipboardOptions = {}): UseClipboardResult {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const copy = useCallback(
    async (text: string) => {
      setError(null);
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
        } else if (typeof document !== 'undefined') {
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.setAttribute('readonly', '');
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          const ok = document.execCommand('copy');
          document.body.removeChild(ta);
          if (!ok) throw new Error('execCommand copy failed');
        } else {
          throw new Error('Clipboard not available');
        }
        setCopied(true);
        if (resetMs > 0) {
          setTimeout(() => setCopied(false), resetMs);
        }
        return true;
      } catch (e) {
        setError(e instanceof Error ? e : new Error(String(e)));
        return false;
      }
    },
    [resetMs],
  );

  return { copy, copied, error };
}
