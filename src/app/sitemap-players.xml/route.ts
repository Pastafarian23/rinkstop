import { supabaseAdmin } from '@/lib/supabase';
import { baseUrl, isHighQualityPlayer } from '@/lib/sitemap-shared';

// Sub-sitemap for player profile pages. Same URLs as the main /sitemap.xml
// for players — split out for dedicated crawl pipeline. Emits all
// high-quality active players (1,700+ rows, well under Google's 50K URL
// sitemap cap). The HQ filter is applied at the DB layer (team_id not null
// AND at least one of position/nationality/headshot_url present) so the
// result window matches the in-memory isHighQualityPlayer() check exactly.

export const revalidate = 3600;

export async function GET() {
  if (!supabaseAdmin) {
    return new Response('<!-- supabaseAdmin unavailable -->', { status: 503 });
  }

  // Apply the high-quality filter at the DB layer so the result window is
  // guaranteed to pass isHighQualityPlayer() in-memory. The previous query
  // (top-500-by-updated_at) was eaten by the in-memory filter because the
  // most-recently-touched rows were all from a 2026-08-23 backfill sync that
  // touched unverified rows without team_id. Result: empty <urlset></urlset>
  // even though 1,763 high-quality players exist. Fix: push the filter into
  // the WHERE clause via PostgREST 'or' so the window all pass.
  //
  // PAGINATION (2026-11-11): the query had NO limit, which reads like
  // "fetch everything" — but PostgREST caps every response at 1,000 rows
  // (`max-rows`). The live sitemap was serving exactly 1,000 <loc> entries
  // when 1,763 qualify. A count of exactly 1000 is a truncation, never a
  // size. 763 high-quality player pages were invisible to Google.
  //
  // URL FORM (2026-11-11): the <loc> used the row UUID
  // (`/directory/players/<uuid>`), but the player page's own canonical tag
  // is the SLUG (`/directory/players/darnell-nurse`). Every other entity
  // sub-sitemap already emits slugs — teams, rinks, leagues. So the sitemap
  // was submitting 1,000 non-canonical URLs and never the keyword URLs
  // that actually rank. Google sees the UUID URL, the page says the slug
  // is canonical, and the keyword URL is never submitted.
  const PAGE = 1000;
  const players: any[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabaseAdmin
      .from('players')
      // SELECT all columns the in-memory isHighQualityPlayer() check
      // evaluates (team_id, position, nationality, headshot_url). Even
      // though the WHERE clause guarantees team_id not-null server-side,
      // the in-memory filter STILL needs to read each field to confirm —
      // it returns false on undefined and would silently drop every row.
      // (Found 2026-09-09: previous fix added position/nationality/headshot
      // but missed team_id, which is the first thing the filter checks.)
      .select('id, slug, updated_at, first_name, last_name, team_id, position, nationality, headshot_url')
      .eq('is_active', true)
      .not('team_id', 'is', null)
      .or('position.not.is.null,nationality.not.is.null,headshot_url.not.is.null')
      .order('updated_at', { ascending: false })
      .range(from, from + PAGE - 1);

    if (error) break;
    const batch = data || [];
    players.push(...batch);
    if (batch.length < PAGE) break;
  }

  const filtered = players.filter(isHighQualityPlayer);

  // A player without a slug cannot produce a canonical URL. Emitting the
  // UUID as a fallback would put a non-canonical URL back in the sitemap.
  const withSlug = filtered.filter((p) => !!p.slug);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${withSlug.map(p => `  <url>
    <loc>${baseUrl}/directory/players/${p.slug}</loc>
    <lastmod>${p.updated_at ? new Date(p.updated_at).toISOString() : new Date().toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}