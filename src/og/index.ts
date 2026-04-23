/**
 * OG sub-entry — runtime-neutral. Use with @vercel/og (Vercel/Next.js Edge),
 * workers-og (Cloudflare), or any other satori-based ImageResponse.
 *
 * `@vercel/og` is an optional peer dependency. The handler dynamically imports
 * it on first invocation; consumers who never call `createOgHandler` don't pay
 * the dependency cost.
 */
export { OgImageTemplate } from './template';
export type { OgTemplateProps } from './template';
export { buildOgImageUrl } from './build-url';
export type { BuildOgImageUrlInput } from './build-url';
export { createOgHandler } from './create-handler';
export type { OgHandler, OgHandlerOptions } from './create-handler';
