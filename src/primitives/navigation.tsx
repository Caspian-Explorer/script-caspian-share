import type { CaspianNavigation, UseCaspianNavigation } from './types';

export const useDefaultCaspianNavigation: UseCaspianNavigation = (): CaspianNavigation => {
  return {
    pathname: typeof window === 'undefined' ? '/' : window.location.pathname,
    push: (href: string) => {
      if (typeof window !== 'undefined') window.location.href = href;
    },
    replace: (href: string) => {
      if (typeof window !== 'undefined') window.location.replace(href);
    },
    back: () => {
      if (typeof window !== 'undefined') window.history.back();
    },
  };
};
