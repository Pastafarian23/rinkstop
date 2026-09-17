import { supabaseAdmin } from '@/lib/supabase';
import { baseUrl } from '@/lib/sitemap-shared';

// Sub-sitemap for game detail pages (/directory/games/[id]).
// Includes: upcoming games (next 30 days) + recent games (last 7 days).
// Rationale: searchers want live/recent scores; Google should crawl
// these pages frequently. Historical games (>7 days old) get crawled
// via the main sitemap's lower-frequency bucket.

export const revalidate = 1800; // 30 minutes — scores change often

export async function GET() {
  if (!supabaseAdmin) {
    return new Response('<!-- supabaseAdmin unavailable -->', { status: 503 });
  }

  const now = new Date();
  const recentCutoff = new Date(now.getTime() - 7 * 86400000).toISOString();
  const upcomingCutoff = new Date(now.getTime() + 30 * 86400000).toISOString();

  const { data: fixtures } = await supabaseAdmin
    .from('fixtures')
    .select('id, updated_at, scheduled_at, status')
    .or(`scheduled_at.gte.${recentCutoff},scheduled_at.lte.${upcomingCutoff}`)
    .order('scheduled_at', { ascending: false })
    .limit(10000);

  if (!fixtures || fixtures.length === 0) {
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`,
      { headers: { 'Content-Type': 'application/xml' } }
    );
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${fixtures.map(f => {
  // Priority: live games > upcoming > recent completed
  const isLive = f.status === 'in_progress';
  const isUpcoming = new Date(f.scheduled_at) > now;
  const priority = isLive ? 0.9 : isUpcoming ? 0.8 : 0.6;
  const changefreq = isLive ? 'always' : isUpcoming ? 'hourly' : 'daily';
  return `  <url>
    <loc>${baseUrl}/directory/games/${f.id}</loc>
    <lastmod>${f.updated_at ? new Date(f.updated_at).toISOString() : new Date().toISOString()}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=1800, s-maxage=1800',
    },
  });
}
