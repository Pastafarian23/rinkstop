import { supabaseAdmin } from '@/lib/supabase';
import { baseUrl } from '@/lib/sitemap-shared';
import { INDEXABILITY_SQL } from '@/lib/game-indexable-sql';

// 2026-10-14 (Phase 3 follow-up): paginated sitemap.
//
// The previous version was capped at 1000 rows by PostgREST's
// default max-rows, which meant the first 1000 were all `scheduled`
// future games and no finished games ever appeared in the sitemap.
//
// New approach:
//   1. Two window queries: finished (last 90 days) and upcoming
//      (next 30 days).  Each is paginated with .range() in pages
//      of 1000 until the page comes back short, so we get ALL
//      matching rows.
//   2. The indexability decision uses the same SQL CASE expression
//      as the page-side isGameIndexable() — see
//      src/lib/game-indexable-sql.ts.  We wrap the CASE in a HAVING
//      filter (well, a derived-table WHERE) so only 'index' rows
//      make it into the XML.
//   3. If the combined URL count exceeds 50,000 we split into a
//      sitemap INDEX (sitemap-games-{n}.xml) plus a master
//      sitemap-games-index.xml listing the children.  This
//      protects the per-file size limit (Google's is 50,000 URLs
//      or 50MB per file).

export const revalidate = 1800; // 30 minutes — scores change often
const PAGE_SIZE = 1000; // PostgREST max-rows
const MAX_URLS_PER_FILE = 50000; // sitemap.org limit

interface SitemapFixture {
  id: string;
  updated_at: string;
  scheduled_at: string;
  status: string;
  home_team_id: string | null;
  away_team_id: string | null;
  indexability: 'index' | 'noindex';
}

async function fetchWindow(
  startIso: string,
  endIso: string,
  order: 'asc' | 'desc',
): Promise<SitemapFixture[]> {
  if (!supabaseAdmin) return [];
  const out: SitemapFixture[] = [];
  let offset = 0;
  // SAFETY: a hard cap of 200 pages (200,000 rows) so a misconfigured
  // window can't loop forever.
  for (let page = 0; page < 200; page++) {
    const { data, error } = await supabaseAdmin
      .from('fixtures')
      .select(`id, updated_at, scheduled_at, status, home_team_id, away_team_id, league:leagues(slug), indexability:${INDEXABILITY_SQL}`)
      .or(`scheduled_at.gte.${startIso},scheduled_at.lte.${endIso}`)
      .eq('indexability', 'index')
      .order('scheduled_at', { ascending: order === 'asc' })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) {
      console.error('sitemap-games: query error', error);
      break;
    }
    if (!data || data.length === 0) break;
    out.push(...(data as unknown as SitemapFixture[]));
    if (data.length < PAGE_SIZE) break; // last page
    offset += PAGE_SIZE;
  }
  return out;
}

function urlXmlFor(f: SitemapFixture, now: Date): string {
  const isLive = f.status === 'in_progress';
  const isUpcoming = new Date(f.scheduled_at) > now;
  const priority = isLive ? 0.9 : isUpcoming ? 0.8 : 0.6;
  const changefreq = isLive ? 'always' : isUpcoming ? 'hourly' : 'daily';
  const lastmod = f.updated_at ? new Date(f.updated_at).toISOString() : new Date().toISOString();
  return `  <url>
    <loc>${baseUrl}/directory/games/${f.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

function wrapUrlset(body: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>`;
}

function sitemapIndexXml(childFiles: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${childFiles.map(f => `  <sitemap>
    <loc>${baseUrl}${f}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>`).join('\n')}
</sitemapindex>`;
}

async function fetchAllFixtures(): Promise<{ fixtures: SitemapFixture[]; counts: { finished: number; upcoming: number; total: number } }> {
  const now = new Date();
  const recentCutoff = new Date(now.getTime() - 90 * 86400000).toISOString();
  const upcomingCutoff = new Date(now.getTime() + 30 * 86400000).toISOString();
  // Two queries: finished (last 90d, newest first) + upcoming (next 30d, soonest first).
  // We run them in parallel — the queries hit the same DB but are
  // independent selects.
  const [finished, upcoming] = await Promise.all([
    fetchWindow(recentCutoff, now.toISOString(), 'desc'),
    fetchWindow(now.toISOString(), upcomingCutoff, 'asc'),
  ]);
  return {
    fixtures: [...finished, ...upcoming],
    counts: { finished: finished.length, upcoming: upcoming.length, total: finished.length + upcoming.length },
  };
}

export async function GET(request: Request) {
  if (!supabaseAdmin) {
    return new Response('<!-- supabaseAdmin unavailable -->', { status: 503 });
  }

  const url = new URL(request.url);
  // Sitemap index file URL: /sitemap-games.xml?sitemap=N
  // Individual chunk URL: /sitemap-games.xml?sitemap=N&chunk=M
  const sitemapParam = url.searchParams.get('sitemap');
  const chunkParam = url.searchParams.get('chunk');
  const now = new Date();
  const { fixtures, counts } = await fetchAllFixtures();

  // No fixtures -> empty urlset
  if (fixtures.length === 0) {
    return new Response(wrapUrlset(''), {
      headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=1800, s-maxage=1800' },
    });
  }

  // Single file: under the cap.  Return the urlset directly.
  if (fixtures.length <= MAX_URLS_PER_FILE) {
    const body = fixtures.map(f => urlXmlFor(f, now)).join('\n');
    return new Response(wrapUrlset(body), {
      headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=1800, s-maxage=1800' },
    });
  }

  // Over the cap: split into numbered chunks.  When sitemapParam
  // is absent, return a sitemap-index pointing at the chunks.
  const chunks: SitemapFixture[][] = [];
  for (let i = 0; i < fixtures.length; i += MAX_URLS_PER_FILE) {
    chunks.push(fixtures.slice(i, i + MAX_URLS_PER_FILE));
  }
  if (sitemapParam === null) {
    const indexXml = sitemapIndexXml(
      chunks.map((_, i) => `/sitemap-games.xml?sitemap=${i}`),
    );
    return new Response(indexXml, {
      headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=1800, s-maxage=1800' },
    });
  }
  const chunkIdx = parseInt(sitemapParam, 10);
  if (Number.isNaN(chunkIdx) || chunkIdx < 0 || chunkIdx >= chunks.length) {
    return new Response('<!-- invalid sitemap index -->', { status: 404 });
  }
  // Optional ?chunk=N for further sub-splitting (not used yet but
  // supported for future growth).
  if (chunkParam !== null) {
    return new Response('<!-- chunk sub-splits not enabled -->', { status: 404 });
  }
  const body = chunks[chunkIdx].map(f => urlXmlFor(f, now)).join('\n');
  return new Response(wrapUrlset(body), {
    headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=1800, s-maxage=1800' },
  });
}
