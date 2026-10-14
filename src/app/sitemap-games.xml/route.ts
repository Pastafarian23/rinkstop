import { supabaseAdmin } from '@/lib/supabase';
import { baseUrl } from '@/lib/sitemap-shared';

// 2026-10-14 (Phase 3 follow-up): paginated sitemap.
//
// The previous version was capped at 1000 rows by PostgREST's
// default max-rows, which meant the first 1000 were all `scheduled`
// future games and no finished games ever appeared in the sitemap.
//
// New approach:
//   1. Two separate window queries (paginated with .range()):
//        a. finished: last 90 days, ordered scheduled_at DESC
//           (newest first).  Only ~hundreds of rows expected.
//        b. scheduled: next 30 days, ordered scheduled_at ASC
//           (soonest first).  Up to 50k possible.
//   2. Indexability filter applied as SQL WHERE conditions (NOT a
//      derived column — PostgREST doesn't accept raw column refs as
//      derived values).  The full CASE in
//      src/lib/game-indexable-sql.ts INDEXABILITY_SQL can't be used
//      directly as a derived value, so we apply its conditions as
//      WHERE clauses:
//        - status NOT IN (cancelled, postponed)
//        - home_team_id IS NOT NULL
//        - away_team_id IS NOT NULL
//      The lower-league vs top-tier distinction can't be done in
//      a single filter without a join + CASE; both groups index as
//      long as both teams are present.  Acceptable: the page-side
//      isGameIndexable can be stricter, and the agreement script
//      will catch divergences.
//   3. If the combined URL count exceeds 50,000 (sitemap.org limit),
//      the route returns a <sitemapindex> pointing at numbered
//      chunks (/sitemap-games.xml?sitemap=N).

export const revalidate = 1800; // 30 minutes — scores change often
const PAGE_SIZE = 1000; // PostgREST max-rows
const MAX_URLS_PER_FILE = 50000; // sitemap.org limit

interface SitemapFixture {
  id: string;
  updated_at: string;
  scheduled_at: string;
  status: string;
}

async function paginatedSelect(
  // Built query with all .where filters applied, just needs .order + .range
  base: any,
  orderAsc: boolean,
  maxPages = 200,
): Promise<SitemapFixture[]> {
  if (!base) return [];
  const out: SitemapFixture[] = [];
  let offset = 0;
  for (let page = 0; page < maxPages; page++) {
    const { data, error } = await base
      .order('scheduled_at', { ascending: orderAsc })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) { console.error('sitemap-games:', error); break; }
    if (!data || data.length === 0) break;
    out.push(...(data as SitemapFixture[]));
    if (data.length < PAGE_SIZE) break;
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

async function fetchAllFixtures(): Promise<{ fixtures: SitemapFixture[]; counts: { finished: number; scheduled: number; total: number } }> {
  if (!supabaseAdmin) return { fixtures: [], counts: { finished: 0, scheduled: 0, total: 0 } };
  const now = new Date();
  const recentCutoff = new Date(now.getTime() - 90 * 86400000).toISOString();
  const upcomingCutoff = new Date(now.getTime() + 30 * 86400000).toISOString();

  // Two parallel queries.  Each is a separate paginated select.
  // - finished: scheduled_at >= recentCutoff AND scheduled_at <= now
  //   ordered DESC (newest first)
  // - scheduled: scheduled_at >= now AND scheduled_at <= upcomingCutoff
  //   ordered ASC (soonest first)
  // Loose pre-filter at the SQL level (skip rows that the RPC
  // would always reject — cancelled/postponed/missing team_ids),
  // then call is_game_indexable_batch per page to apply the same
  // real predicate as the page-side isGameIndexable.
  const finishedQuery = supabaseAdmin
    .from('fixtures')
    .select('id, updated_at, scheduled_at, status')
    .gte('scheduled_at', recentCutoff)
    .lte('scheduled_at', now.toISOString())
    .not('status', 'in', '(cancelled,postponed)')
    .not('home_team_id', 'is', null)
    .not('away_team_id', 'is', null);

  const scheduledQuery = supabaseAdmin
    .from('fixtures')
    .select('id, updated_at, scheduled_at, status')
    .gte('scheduled_at', now.toISOString())
    .lte('scheduled_at', upcomingCutoff)
    .not('status', 'in', '(cancelled,postponed)')
    .not('home_team_id', 'is', null)
    .not('away_team_id', 'is', null);

  // Fetch raw candidates (no indexability filter at the SQL level)
  // then call the batch RPC to apply the same predicate the page uses.
  const [rawFinished, rawScheduled] = await Promise.all([
    paginatedSelect(finishedQuery, /* orderAsc */ false),
    paginatedSelect(scheduledQuery, /* orderAsc */ true),
  ]);
  const allRaw = [...rawFinished, ...rawScheduled];

  // Apply the real indexability check via batch RPC.  Pages of 500
  // to keep RPC payload modest.
  const BATCH = 500;
  const indexableIds = new Set<string>();
  for (let i = 0; i < allRaw.length; i += BATCH) {
    const batch = allRaw.slice(i, i + BATCH);
    const { data: results, error } = await supabaseAdmin.rpc('is_game_indexable_batch', { ids: batch.map(r => r.id) });
    if (error) {
      console.error('sitemap-games: rpc error', error);
      // fail open: keep all rows from this batch so we don't accidentally drop pages
      for (const r of batch) indexableIds.add(r.id);
      continue;
    }
    for (const row of (results || [])) {
      if (row.indexable === 'index') indexableIds.add(row.out_id);
    }
  }
  const fixtures = allRaw.filter(r => indexableIds.has(r.id));
  return {
    fixtures,
    counts: {
      finished: fixtures.filter(f => f.status === 'completed').length,
      scheduled: fixtures.filter(f => f.status === 'scheduled' || f.status === 'in_progress').length,
      total: fixtures.length,
    },
  };
}

export async function GET(request: Request) {
  if (!supabaseAdmin) {
    return new Response('<!-- supabaseAdmin unavailable -->', { status: 503 });
  }

  const url = new URL(request.url);
  // Sitemap index file: /sitemap-games.xml?sitemap=N
  const sitemapParam = url.searchParams.get('sitemap');
  const now = new Date();
  const { fixtures, counts } = await fetchAllFixtures();
  // Counts are not exposed in headers (would be useful for the
  // agreement script), so log them server-side for debugging.
  console.log(`sitemap-games: finished=${counts.finished} scheduled=${counts.scheduled} total=${counts.total}`);

  if (fixtures.length === 0) {
    return new Response(wrapUrlset(''), {
      headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=1800, s-maxage=1800' },
    });
  }

  if (fixtures.length <= MAX_URLS_PER_FILE) {
    const body = fixtures.map(f => urlXmlFor(f, now)).join('\n');
    return new Response(wrapUrlset(body), {
      headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=1800, s-maxage=1800' },
    });
  }

  // Over the cap: split into numbered chunks.
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
  const body = chunks[chunkIdx].map(f => urlXmlFor(f, now)).join('\n');
  return new Response(wrapUrlset(body), {
    headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=1800, s-maxage=1800' },
  });
}
