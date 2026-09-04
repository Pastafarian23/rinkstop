/**
 * Default OpenGraph image + helpers for page metadata.
 *
 * Why this exists: when a page sets ANY field on `openGraph` Next.js
 * REPLACES the layout's openGraph entirely (per docs: "pages can
 * override top-level metadata properties"). The layout sets a default
 * `images` array, but once a page touches `openGraph` it loses that
 * default unless the page also sets `images`.
 *
 * Historically this caused 99+ pages to render without `og:image`. Now
 * every page uses `withDefaultOg()` to merge the default image with
 * the page-specific openGraph fields.
 *
 * Usage:
 *
 *   return {
 *     title: 'KHL Hockey Teams 2026-27',
 *     openGraph: withDefaultOg({
 *       title: 'KHL Hockey Teams 2026-27',
 *       description: '...',
 *       url: 'https://rinkstop.com/directory/khl',
 *       siteName: 'RinkStop',
 *       type: 'website',
 *     }),
 *   };
 */

import type { Metadata } from 'next';

/** RinkStop brand default social-share image (1200x630). */
export const DEFAULT_OG_IMAGE = {
  url: 'https://rinkstop.com/og-image.png',
  width: 1200,
  height: 630,
  alt: "RinkStop — The World's Hockey Directory",
} as const;

/**
 * Returns the page's openGraph fields plus the default og:image if the
 * page didn't already provide one.
 */
export function withDefaultOg(
  og: NonNullable<Metadata['openGraph']>,
): NonNullable<Metadata['openGraph']> {
  const existing = og.images;
  const hasImages = Array.isArray(existing) ? existing.length > 0 : Boolean(existing);
  if (hasImages) return og;
  return { ...og, images: [DEFAULT_OG_IMAGE] };
}
