import type { CaspianImageProps } from './types';

export function DefaultCaspianImage({
  src,
  alt,
  className,
  width,
  height,
  sizes: _sizes,
  fill,
  priority,
  loading,
}: CaspianImageProps) {
  const style = fill
    ? ({ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' } as const)
    : undefined;
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      loading={loading ?? (priority ? 'eager' : 'lazy')}
      style={style}
    />
  );
}
