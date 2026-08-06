import { supabaseAdmin } from '@/lib/supabase';
import { baseUrl, isHighQualityTeam } from '@/lib/sitemap-shared';

// Sub-sitemap for team detail pages. Same URLs as the main /sitemap.xml,
// just split out so Google can crawl team pages through a dedicated
// pipeline. Page handler at /directory/teams/[slug] reads from
// team_workspaces — we use team_workspaces as the source so we only emit
// slugs that have a public profile (avoids the 486 404s we saw in 2026-07).

export const revalidate = 3600;

export async function GET() {
  if (!supabaseAdmin) {
    return new Response('<!-- supabaseAdmin unavailable -->', { status: 503 });
  }

  // Main sitemap uses teamWorkspacesResult as the slug source (verified 2026-07-07).
  // We do the same here — don't double-fetch, just pull slugs + updated_at.
  const { data: workspaces } = await supabaseAdmin
    .from('team_workspaces')
    .select('slug, updated_at, country_code, home_city, league_id, division, avatar_url, website_url')
    .eq('is_active', true);

  const filtered = (workspaces || []).filter(isHighQualityTeam);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${filtered.map(t => `  <url>
    <loc>${baseUrl}/directory/teams/${t.slug}</loc>
    <lastmod>${t.updated_at ? new Date(t.updated_at).toISOString() : new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}