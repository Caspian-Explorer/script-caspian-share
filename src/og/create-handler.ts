import type { ReactElement } from 'react';
import { OgImageTemplate, type OgTemplateProps } from './template';

export interface OgHandlerOptions {
  /**
   * Render function returning a JSX element compatible with @vercel/og's
   * ImageResponse (or workers-og, etc). Defaults to `OgImageTemplate`.
   */
  template?: (props: OgTemplateProps) => ReactElement;
  /** Title used when the request omits `?title=`. */
  defaultTitle?: string;
  defaultDescription?: string;
  defaultBrand?: string;
  defaultTheme?: OgTemplateProps['theme'];
  defaultAccent?: string;
  /** Output dimensions. Defaults to 1200×630 (recommended OG/Twitter card). */
  width?: number;
  height?: number;
  /** HTTP cache header. Defaults to `public, max-age=31536000, immutable`. */
  cacheControl?: string;
}

export type OgHandler = (request: Request) => Promise<Response>;

/**
 * Build a Web-standard `(Request) => Promise<Response>` handler that returns a
 * dynamic OG image. Drop it into a Next.js Edge route, Cloudflare Worker, or
 * Netlify Edge Function.
 *
 * `@vercel/og` is a peer dependency (`optional: true`). It is dynamically
 * imported the first time the handler runs so consumers who don't generate OG
 * images don't pay the bundle cost.
 *
 *   // app/api/og/route.tsx
 *   import { createOgHandler } from '@caspian-explorer/script-caspian-share/og';
 *   export const runtime = 'edge';
 *   export const GET = createOgHandler({
 *     defaultTitle: 'My Site',
 *     defaultBrand: 'My Site',
 *     defaultTheme: 'midnight',
 *   });
 */
export function createOgHandler(options: OgHandlerOptions = {}): OgHandler {
  const {
    template = OgImageTemplate,
    defaultTitle = 'Untitled',
    defaultDescription,
    defaultBrand,
    defaultTheme,
    defaultAccent,
    width = 1200,
    height = 630,
    cacheControl = 'public, max-age=31536000, immutable',
  } = options;

  return async function ogHandler(request: Request): Promise<Response> {
    const { searchParams } = new URL(request.url);
    const props: OgTemplateProps = {
      title: searchParams.get('title') ?? defaultTitle,
      description: searchParams.get('description') ?? defaultDescription,
      brand: searchParams.get('brand') ?? defaultBrand,
      theme: (searchParams.get('theme') as OgTemplateProps['theme']) ?? defaultTheme,
      accent: searchParams.get('accent') ?? defaultAccent,
      footer: searchParams.get('footer') ?? undefined,
    };

    let ImageResponse: typeof import('@vercel/og').ImageResponse;
    try {
      ({ ImageResponse } = await import('@vercel/og'));
    } catch {
      return new Response(
        'OG image generation requires the optional peer dependency `@vercel/og`. Run `npm install @vercel/og`.',
        { status: 500, headers: { 'content-type': 'text/plain' } },
      );
    }

    const image = new ImageResponse(template(props), {
      width,
      height,
    });

    if (cacheControl) {
      image.headers.set('cache-control', cacheControl);
    }
    return image;
  };
}
