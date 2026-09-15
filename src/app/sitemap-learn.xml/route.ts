// /sitemap-learn.xml
//
// Sub-sitemap for the /learn index page and every /learn/* subpage.
// Built from src/lib/learn-catalog.ts (the single source of truth) so
// adding a new learn page = one entry in the catalog, automatically
// picked up here on next cache refresh.
//
// Also includes dynamic Q&A pages from qa-content-generator.ts:
//   - Per-country Q&A (/learn/hockey-in/{slug})
//   - Per-league Q&A (/learn/{slug}-teams)
//   - Per-city Q&A (/learn/hockey-rinks-in/{city}-{country})
// These are auto-generated from the live database and updated hourly.
// They give RinkStop ~250+ direct-answer landing pages for AI engines
// (Featured Snippet format) — see memory/2026-09-14-ai-visibility-plan.md.
//
// 1h cache, same cadence as the other sub-sitemaps.

import { baseUrl } from '@/lib/sitemap-shared';
import { LEARN } from '@/lib/learn-catalog';
import { generateQAPages } from '@/lib/qa-content-generator';

export const revalidate = 3600;

export async function GET() {
  // Per-page lastmod from the catalog entry's `verified` date so that
  // when a page is updated individually, the sitemap reflects it.
  // The index page uses today's date (the most recently updated entry).
  const today = '2026-09-14';

  // Dynamic Q&A pages
  const qaPages = await generateQAPages();

  const urls: { loc: string; lastmod: string; priority: number }[] = [
    // Index page
    { loc: `${baseUrl}/learn`, lastmod: today, priority: 0.85 },
    // Every individual learn page from the catalog
    ...LEARN.filter((l) => l && l.href).map((l) => ({
      loc: `${baseUrl}${l.href}`,
      lastmod: l.verified,
      priority: l.category === 'getting-started' ? 0.8 : 0.7,
    })),
    // Dynamic Q&A pages — auto-generated from the live database
    ...qaPages.map((p) => ({
      loc: `${baseUrl}${p.url_path}`,
      lastmod: today,
      // Country Q&A and league Q&A are higher priority than city Q&A
      priority: p.slug.startsWith('hockey-in-') || p.slug.endsWith('-teams') ? 0.7 : 0.6,
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