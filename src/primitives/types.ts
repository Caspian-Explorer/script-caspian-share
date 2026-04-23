import type { ComponentType, ReactNode } from 'react';

/**
 * Minimal contract the host framework must satisfy so Caspian Share components
 * can render links, images, and navigate without depending on next/link, next/image
 * or next/navigation.
 *
 * Consumers pass these via <CaspianShareProvider adapters={{ ... }}>. The shape is
 * identical to script-caspian-store so a single adapter object works for both.
 */

export interface CaspianLinkProps {
  href: string;
  className?: string;
  style?: React.CSSProperties;
  children?: ReactNode;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  target?: string;
  rel?: string;
  'aria-label'?: string;
}

export type CaspianLinkComponent = ComponentType<CaspianLinkProps>;

export interface CaspianImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  sizes?: string;
  fill?: boolean;
  priority?: boolean;
  loading?: 'lazy' | 'eager';
}

export type CaspianImageComponent = ComponentType<CaspianImageProps>;

export interface CaspianNavigation {
  pathname: string;
  push: (href: string) => void;
  replace: (href: string) => void;
  back: () => void;
}

export type UseCaspianNavigation = () => CaspianNavigation;

export interface FrameworkAdapters {
  Link: CaspianLinkComponent;
  Image?: CaspianImageComponent;
  useNavigation: UseCaspianNavigation;
}
