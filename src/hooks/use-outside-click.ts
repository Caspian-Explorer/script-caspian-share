import { useEffect, type RefObject } from 'react';

/**
 * Calls `handler` when a pointerdown lands outside any of the supplied refs.
 * Pass an array so dropdown triggers + their menus can both be excluded.
 */
export function useOutsideClick(
  refs: RefObject<HTMLElement | null> | RefObject<HTMLElement | null>[],
  handler: (event: PointerEvent) => void,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return;
    const list = Array.isArray(refs) ? refs : [refs];
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      for (const ref of list) {
        if (ref.current && ref.current.contains(target)) return;
      }
      handler(e);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [refs, handler, enabled]);
}
