import type { CaspianLinkProps } from './types';

export function DefaultCaspianLink({
  href,
  className,
  style,
  children,
  onClick,
  target,
  rel,
  'aria-label': ariaLabel,
}: CaspianLinkProps) {
  return (
    <a
      href={href}
      className={className}
      style={style}
      onClick={onClick}
      target={target}
      rel={rel}
      aria-label={ariaLabel}
    >
      {children}
    </a>
  );
}
