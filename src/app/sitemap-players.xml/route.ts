import { supabaseAdmin } from '@/lib/supabase';
import { baseUrl, isHighQualityPlayer } from '@/lib/sitemap-shared';

// Sub-sitemap for player profile pages. Same URLs as the main /sitemap.xml
// for players — split out for dedicated crawl pipeline. Main sitemap caps
// players at .limit(500) ordered by updated_at desc; we mirror that here
// so the two never disagree.

export const revalidate = 3600;

export async function GET() {
  if (!supabaseAdmin) {
    return new Response('<!-- supabaseAdmin unavailable -->', { status: 503 });
  }

  const { data: players } = await supabaseAdmin
    .from('players')
    .select('id, updated_at, first_name, last_name, position, team_id, nationality, headshot_url')
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(500);

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