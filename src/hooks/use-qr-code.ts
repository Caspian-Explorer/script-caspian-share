import { useEffect, useState } from 'react';

export interface UseQrCodeOptions {
  /** Pixel width/height. Default 240. */
  size?: number;
  /** Light (background) color. Default #ffffff. */
  light?: string;
  /** Dark (foreground) color. Default #000000. */
  dark?: string;
  /** Quiet-zone margin in modules. Default 1. */
  margin?: number;
  /** Error correction level. Default 'M'. */
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}

export interface UseQrCodeResult {
  /** PNG data-URL when ready. */
  dataUrl: string | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Lazy-load `qrcode` and render the QR for a string. The `qrcode` package is
 * an **optional peer dependency** — it's dynamically imported the first time
 * this hook runs. Consumers who never render a QR don't pay the bundle cost.
 *
 *   npm install qrcode
 */
export function useQrCode(value: string | null | undefined, options: UseQrCodeOptions = {}): UseQrCodeResult {
  const { size = 240, light = '#ffffff', dark = '#000000', margin = 1, errorCorrectionLevel = 'M' } = options;
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(value));
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!value) {
      setDataUrl(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const mod: typeof import('qrcode') = await import('qrcode');
        // The `qrcode` package exports both as namespace and default — handle both.
        const toDataURL =
          (mod as unknown as { default?: { toDataURL: typeof mod.toDataURL } }).default?.toDataURL
          ?? mod.toDataURL;
        const url = await toDataURL(value, {
          width: size,
          margin,
          errorCorrectionLevel,
          color: { dark, light },
        });
        if (!cancelled) {
          setDataUrl(url);
          setLoading(false);
        }
      } catch (e) {
        if (cancelled) return;
        const err = e instanceof Error ? e : new Error(String(e));
        // Most likely cause: peer dep not installed.
        const friendly =
          err.message.includes('Cannot find') || err.name === 'ResolutionError'
            ? new Error("QR generation requires the 'qrcode' peer dependency. Run: npm install qrcode")
            : err;
        setError(friendly);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [value, size, light, dark, margin, errorCorrectionLevel]);

  return { dataUrl, loading, error };
}
