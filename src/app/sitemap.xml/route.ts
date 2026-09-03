// Sitemap index for rinkstop.com. Replaces the previous flat-urlset
// /sitemap.xml (src/app/sitemap.ts) which was deleted as part of this
// change. The 7 per-entity sub-sitemaps referenced here were added in
// PR #99 (squash 983db4b8, 2026-07); this index gives Googlebot a
// single discovery file that fans out to per-entity pipelines.
//
// Why a route handler (and not src/app/sitemap.ts): Next.js's built-in
// sitemap convention only emits flat <urlset> output. Sitemapindex
// requires raw XML, which means a custom route handler.

import { baseUrl } from '@/lib/sitemap-shared';

// 1h cache — same cadence as the sub-sitemaps. Edits to sub-sitemap
// contents may take up to 1h to reflect in the index's timestamps, but
// the URLs themselves don't change.
export const revalidate = 3600;

const subSitemaps = [
  'sitemap-static.xml',
  'sitemap-rinks.xml',
  'sitemap-teams.xml',
  'sitemap-players.xml',
  'sitemap-leagues.xml',
  'sitemap-locations.xml',
  'sitemap-news.xml',
  'sitemap-images.xml',
];

export async function GET() {
  const now = new Date().toISOString();
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${subSitemaps
  .map(
    (s) => `  <sitemap>
    <loc>${baseUrl}/${s}</loc>
    <lastmod>${now}</lastmod>
  </sitemap>`
  )
  .join('\n')}
</sitemapindex>
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
