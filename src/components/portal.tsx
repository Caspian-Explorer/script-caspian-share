import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export interface PortalProps {
  children: ReactNode;
  /** Optional container element. Defaults to `document.body`. */
  container?: HTMLElement | null;
}

/**
 * SSR-safe React portal. Renders nothing during SSR + first client paint, then
 * mounts into the container after `useEffect` runs. Hydration-safe.
 */
export function Portal({ children, container }: PortalProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  const target = container ?? (typeof document !== 'undefined' ? document.body : null);
  if (!target) return null;
  return createPortal(children, target);
}
