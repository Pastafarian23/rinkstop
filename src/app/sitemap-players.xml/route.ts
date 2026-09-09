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
  // the WHERE clause via PostgREST 'or' so the 500-row window all pass.
  // We drop .limit(500) because the HQ set is 1,763 rows — well under
  // Google's 50K URL sitemap cap, and emitting them all is more honest than
  // promising coverage we don't deliver.
  const { data: players } = await supabaseAdmin
    .from('players')
    .select('id, updated_at, first_name, last_name')
    .eq('is_active', true)
    .not('team_id', 'is', null)
    .or('position.not.is.null,nationality.not.is.null,headshot_url.not.is.null')
    .order('updated_at', { ascending: false });

  const filtered = (players || []).filter(isHighQualityPlayer);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${filtered.map(p => `  <url>
    <loc>${baseUrl}/directory/players/${p.id}</loc>
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