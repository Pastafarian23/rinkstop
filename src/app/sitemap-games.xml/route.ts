import { supabaseAdmin } from '@/lib/supabase';
import { baseUrl } from '@/lib/sitemap-shared';

// 2026-10-15 (Piece B, Arnel 10:12): sub-sitemap for /directory/games/[id].
//
// Per Arnel's spec:
// 1. revalidate = 3600 (1 hour — page is durable, not minute-by-minute).
// 2. Same indexability rule as the page.  Page-side uses JS predicate
//    in src/lib/game-indexable.ts with real module data.  Sitemap-side
//    can't fetch 1000+ modules, so it uses the SQL-equivalent
//    is_game_indexable_batch function (see supabase/migrations/
//    2026-10-14_game_indexable_batch_rpc.sql).  The two MUST agree;
//    scripts/_check-predicate-agreement.cjs is the verifier.
// 3. Fail closed on RPC error: if is_game_indexable_batch errors,
//    throw the error so Vercel keeps the last good sitemap per ISR
//    semantics.  Never serve "all rows included" on an error.
// 4. On supabaseAdmin unavailable (cold start with no env), return
//    503 with a short Cache-Control so the error doesn't get cached
//    for an hour and break the sitemap until next ISR cycle.
// 5. URL count cap: sitemap.org max is 50,000.  If our filtered set
//    exceeds 50k, split into a sitemap index + numbered children
//    (over-50k games in our windows is theoretically possible with
//    lower-league schedules; the cap is a safety net).

export const revalidate = 3600; // 1 hour

const MAX_URLS_PER_FILE = 50000; // sitemap.org hard limit
const COLD_FAILURE_CACHE_SECONDS = 30; // short TTL on 503 so we don't poison the cache

interface SitemapFixture {
  id: string;
  updated_at: string;
  scheduled_at: string;
  status: string;
}

async function paginatedSelect(
  // Base query with all .where filters applied; just needs .order + .range
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
      .range(offset, offset + 999); // PostgREST max-rows default
    if (error) {
      // Fail closed: surface the error so Vercel keeps the last
      // good sitemap rather than serving a partial/empty one.
      console.error('sitemap-games: paginatedSelect error, rethrowing', error);
      throw error;
    }
    if (!data || data.length === 0) break;
    out.push(...(data as SitemapFixture[]));
    if (data.length < 1000) break;
    offset += 1000;
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

async function fetchAllIndexableFixtures(): Promise<{
  fixtures: SitemapFixture[];
  counts: { finished: number; scheduled: number; total: number };
}> {
  if (!supabaseAdmin) {
    // Cold failure: no service-role key.  Return null so the route
    // handler can return 503 with a short Cache-Control.  Do NOT
    // throw — that would surface as 500 in Vercel's ISR cache, and
    // 500s are remembered longer than 503s.
    return { fixtures: [], counts: { finished: 0, scheduled: 0, total: 0 } };
  }

  const now = new Date();
  const recentCutoff = new Date(now.getTime() - 90 * 86400000).toISOString();
  const upcomingCutoff = new Date(now.getTime() + 30 * 86400000).toISOString();

  // Two parallel windows:
  //   - finished: scheduled_at >= recentCutoff (last 90 days) AND
  //     scheduled_at <= now, ordered DESC (newest first).
  //   - scheduled: scheduled_at >= now AND scheduled_at <= upcomingCutoff,
  //     ordered ASC (soonest first).
  // Pre-filter at the SQL level (cancelled/postponed/missing team_ids
  // are excluded) so the batch RPC has fewer rows to evaluate.
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

  const [rawFinished, rawScheduled] = await Promise.all([
    paginatedSelect(finishedQuery, /* orderAsc */ false),
    paginatedSelect(scheduledQuery, /* orderAsc */ true),
  ]);
  const allRaw = [...rawFinished, ...rawScheduled];

  // Apply the same indexability check as the page via the batch RPC.
  // Pages of 500 to keep the RPC payload modest.
  const BATCH = 500;
  const indexableIds = new Set<string>();
  for (let i = 0; i < allRaw.length; i += BATCH) {
    const batch = allRaw.slice(i, i + BATCH);
    const { data: results, error } = await supabaseAdmin.rpc('is_game_indexable_batch', { ids: batch.map(r => r.id) });
    if (error) {
      // 2026-10-15 (Arnel 10:12 step 1, fail-closed): if the
      // indexability RPC errors, throw so Vercel keeps serving the
      // last good sitemap.  Do NOT include all rows on error.
      console.error('sitemap-games: rpc error, rethrowing', error);
      throw error;
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
    // Cold failure: env not loaded yet.  Return 503 with a short
    // Cache-Control so the next request retries quickly.
    return new Response('<!-- sitemap-games: supabaseAdmin unavailable, retry shortly -->', {
      status: 503,
      headers: { 'Cache-Control': `public, max-age=${COLD_FAILURE_CACHE_SECONDS}, s-maxage=${COLD_FAILURE_CACHE_SECONDS}` },
    });
  }

  const url = new URL(request.url);
  // Sitemap index file: /sitemap-games.xml?sitemap=N
  const sitemapParam = url.searchParams.get('sitemap');
  const now = new Date();
  const { fixtures, counts } = await fetchAllIndexableFixtures();
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
