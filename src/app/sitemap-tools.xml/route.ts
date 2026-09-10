// /sitemap-tools.xml
//
// Sub-sitemap for the /tools index page and the 6 calculator subpages.
// The per-calculator URLs are already in /sitemap-static.xml; this
// sub-sitemap adds the new /tools index page (shipped 2026-09-10).
//
// 1h cache, same cadence as the other sub-sitemaps.

import { baseUrl } from '@/lib/sitemap-shared';

export const revalidate = 3600;

export async function GET() {
  const lastmod = '2026-09-10';
  const urls: { loc: string; lastmod: string; priority: number }[] = [
    { loc: `${baseUrl}/tools`, lastmod, priority: 0.85 },
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