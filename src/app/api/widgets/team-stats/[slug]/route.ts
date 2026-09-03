// /api/widgets/team-stats/[slug] — embeddable HTML widget
//
// Returns a minimal HTML fragment (not the full app shell) that can be
// iframed on partner hockey blogs.
//
// Usage:
//   <iframe src="https://rinkstop.com/api/widgets/team-stats/edmonton-oilers"
//           width="420" height="340" frameborder="0"></iframe>
//
// Why this matters for SEO:
// - Every embed is a permanent backlink from a relevant hockey site
// - Bing ranks sites with more high-quality backlinks higher
// - Brand exposure across the hockey community
// - AI engines (ChatGPT, Perplexity) cite us as the source

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { baseUrl } from '@/lib/sitemap-shared';

export const revalidate = 300; // 5min

function esc(s: string | null | undefined): string {
  if (!s) return '';
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c)
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (!supabaseAdmin) {
    return new NextResponse(errorWidget('Database unavailable'), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const { data: team } = await supabaseAdmin
    .from('teams')
    .select('id, name, city, country, league_name, logo_url')
    .eq('slug', slug)
    .maybeSingle();

  if (!team) {
    return new NextResponse(errorWidget('Team not found'), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const { data: games } = await supabaseAdmin
    .from('games')
    .select('game_date, home_team_score, away_team_score, status, home_team_id, away_team_id')
    .or(`home_team_id.eq.${team.id},away_team_id.eq.${team.id}`)
    .order('game_date', { ascending: false })
    .limit(5);

  const finished = (games || []).filter((g: any) => g.status === 'finished');
  const wins = finished.filter((g: any) =>
    (g.home_team_id === team.id && g.home_team_score > g.away_team_score) ||
    (g.away_team_id === team.id && g.away_team_score > g.home_team_score)
  ).length;
  const losses = finished.length - wins;

  const gameRows = (games || []).map((g: any) => {
    const isHome = g.home_team_id === team.id;
    const won = (isHome && g.home_team_score > g.away_team_score) ||
                (!isHome && g.away_team_score > g.home_team_score);
    const opp = isHome ? 'vs' : '@';
    const score = isHome ? `${g.home_team_score}-${g.away_team_score}` : `${g.away_team_score}-${g.home_team_score}`;
    const status = g.status === 'finished' ? (won ? 'W' : 'L') : g.status;
    const cls = status === 'W' ? 'w' : status === 'L' ? 'l' : '';
    return `<tr><td>${g.game_date || ''}</td><td>${opp}</td><td>${score}</td><td class="${cls}">${status}</td></tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(team.name)} — Live Stats | RinkStop</title>
<meta name="description" content="${esc(team.name)} live record and recent games. Data from RinkStop, the global hockey directory.">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #041E42; color: #fff; padding: 16px; font-size: 14px; }
.team-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); }
.team-logo { width: 40px; height: 40px; border-radius: 6px; background: rgba(255,255,255,0.05); }
.team-info h2 { font-size: 16px; font-weight: 700; }
.team-info p { font-size: 12px; color: rgba(255,255,255,0.6); margin-top: 2px; }
.record { display: flex; gap: 8px; margin: 8px 0 12px 0; }
.record span { background: rgba(255,255,255,0.08); padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 700; }
.record .w { color: #4ade80; }
.record .l { color: #f87171; }
table { width: 100%; border-collapse: collapse; font-size: 12px; }
th { text-align: left; color: rgba(255,255,255,0.5); font-weight: 600; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.1); }
td { padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
tr:last-child td { border-bottom: 0; }
.w { color: #4ade80; font-weight: 700; }
.l { color: #f87171; font-weight: 700; }
footer { margin-top: 12px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 10px; color: rgba(255,255,255,0.4); }
footer a { color: #FFB81C; text-decoration: none; }
</style>
</head>
<body>
<div class="team-header">
  ${team.logo_url ? `<img class="team-logo" src="${esc(team.logo_url)}" alt="${esc(team.name)} logo">` : ''}
  <div class="team-info">
    <h2>${esc(team.name)}</h2>
    <p>${esc(team.league_name || '')} · ${esc(team.city || '')}, ${esc(team.country || '')}</p>
  </div>
</div>
<div class="record">
  <span class="w">${wins}W</span>
  <span class="l">${losses}L</span>
</div>
<table>
  <thead><tr><th>Date</th><th>H/A</th><th>Score</th><th>W/L</th></tr></thead>
  <tbody>${gameRows}</tbody>
</table>
<footer>
  Live data via <a href="${baseUrl}/directory/teams/${esc(slug)}" target="_blank" rel="noopener">RinkStop</a> · <a href="${baseUrl}/widgets" target="_blank" rel="noopener">Embed</a>
</footer>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
      'X-Frame-Options': 'ALLOWALL',
    },
  });
}

function errorWidget(msg: string): string {
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:20px;background:#041E42;color:#fff">${esc(msg)}</body></html>`;
}
