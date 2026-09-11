// /sitemap-learn.xml
//
// Sub-sitemap for the /learn index page and every /learn/* subpage.
// Built from src/lib/learn-catalog.ts (the single source of truth) so
// adding a new learn page = one entry in the catalog, automatically
// picked up here on next cache refresh.
//
// 1h cache, same cadence as the other sub-sitemaps.

import { baseUrl } from '@/lib/sitemap-shared';
import { LEARN } from '@/lib/learn-catalog';

export const revalidate = 3600;

export async function GET() {
  const lastmod = '2026-09-10';

  const urls: { loc: string; lastmod: string; priority: number }[] = [
    // Index page
    { loc: `${baseUrl}/learn`, lastmod, priority: 0.85 },
    // Every individual learn page from the catalog
    ...LEARN.map((l) => ({
      loc: `${baseUrl}${l.href}`,
      lastmod,
      priority: l.category === 'getting-started' ? 0.8 : 0.7,
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