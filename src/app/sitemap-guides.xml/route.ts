// /sitemap-guides.xml
//
// Sub-sitemap for the /guides index page and every individual guide.
// Built from src/lib/guides-catalog.ts (the single source of truth)
// so adding a new guide = one entry in the catalog, automatically
// picked up here on next cache refresh.
//
// 1h cache, same cadence as the other sub-sitemaps.

import { baseUrl } from '@/lib/sitemap-shared';
import { GUIDES } from '@/lib/guides-catalog';

export const revalidate = 3600;

export async function GET() {
  const lastmod = '2026-09-10';

  const urls: { loc: string; lastmod: string; priority: number }[] = [
    // Index page
    { loc: `${baseUrl}/guides`, lastmod, priority: 0.85 },
    // Every individual guide from the catalog
    ...GUIDES.map((g) => ({
      loc: `${baseUrl}${g.href}`,
      lastmod,
      priority: g.category === 'parenting' ? 0.8 : 0.7,
    })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <priority>${u.priority.toFixed(1)}</priority>
  </url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}