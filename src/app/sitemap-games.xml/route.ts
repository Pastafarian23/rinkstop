import { supabaseAdmin } from '@/lib/supabase';
import { baseUrl } from '@/lib/sitemap-shared';

// Sub-sitemap for game detail pages (/directory/games/[id]).
//
// 2026-10-14 (Phase 3): per Arnel's spec:
//   - Use the same isGameIndexable predicate (cheap SQL equivalent here
//     since the page-level predicate in src/lib/game-indexable.ts
//     needs runtime data the sitemap doesn't have).  The SQL filter is:
//       status NOT IN ('cancelled', 'postponed')
//     Cancelled/postponed games have no content to index; their [id]
//     page is intentionally noindex+follow and shouldn't be in the
//     sitemap.
//   - Extend the recent-completed window from 7 days to 90 days.  The
//     user spec: "extend finished games to 90 days if they pass".
//   - Keep the upcoming window at 30 days (live scores and next-30
//     is the right balance; longer than 30 is wasteful for upcoming).
//   - Sitemap TTL: 30 min (revalidate = 1800).  Scores change often
//     for in-progress games.

export const revalidate = 1800; // 30 minutes — scores change often

export async function GET() {
  if (!supabaseAdmin) {
    return new Response('<!-- supabaseAdmin unavailable -->', { status: 503 });
  }

  const now = new Date();
  // Window: finished games up to 90 days back, upcoming games up to 30
  // days forward.  Cancelled and postponed games are filtered out at
  // the SQL level so they never appear in the sitemap.
  const recentCutoff = new Date(now.getTime() - 90 * 86400000).toISOString();
  const upcomingCutoff = new Date(now.getTime() + 30 * 86400000).toISOString();

  const { data: fixtures } = await supabaseAdmin
    .from('fixtures')
    .select('id, updated_at, scheduled_at, status')
    .or(`scheduled_at.gte.${recentCutoff},scheduled_at.lte.${upcomingCutoff}`)
    .not('status', 'in', '(cancelled,postponed)')
    .order('scheduled_at', { ascending: false })
    .limit(50000);

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
