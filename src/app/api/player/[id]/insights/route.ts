// src/app/api/player/[id]/insights/route.ts
//
// Hockey Passport Plus feature: Premium insights.
//   GET /api/player/[id]/insights
//     - Returns computed insights for the player (rinks per season,
//       multi-league rate, etc.). The player (or the user's parent if
//       linked) must own the record AND have Identity Plus tier.
//     - On miss, the server computes from rinks/teams/players tables
//       and caches the result in player_insights for 24h.

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const TIER_RANK: Record<string, number> = { free: 0, verified_identity: 1, identity_plus: 2, business_listing: 1, business_plus: 2, club_starter: 1, club_pro: 2, club_elite: 3, league: 4, federation: 5 };
function tierAtLeast(a: string, m: string) { return (TIER_RANK[a] ?? 0) >= (TIER_RANK[m] ?? 0); }

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const cu = await currentUser();
  if (!session.userId || !cu) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = cu.id;
  const { id } = await params;

  // Tier check
  const { data: profile } = await supabaseAdmin
    .from('profiles').select('tier').eq('user_id', userId).maybeSingle();
  if (!tierAtLeast(profile?.tier || 'free', 'identity_plus')) {
    return NextResponse.json(
      { error: 'Premium insights require Hockey Passport Plus', required_tier: 'identity_plus' },
      { status: 402 }
    );
  }

  // Player ownership check (the player row must be claimed by this user)
  const { data: player, error: pErr } = await supabaseAdmin
    .from('players')
    .select('id, user_id, first_name, last_name')
    .eq('id', id)
    .maybeSingle();
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });
  if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 });
  if (player.user_id !== userId) {
    return NextResponse.json({ error: 'Not the player owner' }, { status: 403 });
  }

  // Check cache (valid for 24h)
  const { data: cached } = await supabaseAdmin
    .from('player_insights')
    .select('insight_key, insight_value, computed_at, valid_until')
    .eq('player_id', id)
    .gt('valid_until', new Date().toISOString());

  if (cached && cached.length > 0) {
    return NextResponse.json({
      player_id: id,
      insights: Object.fromEntries(cached.map((c) => [c.insight_key, c.insight_value])),
      cached: true,
      computed_at: cached[0].computed_at,
    });
  }

  // Compute fresh
  const insights: Array<{ key: string; value: unknown }> = [];

  // Rinks per season
  const { data: stamps } = await supabaseAdmin
    .from('rink_stamps')
    .select('created_at')
    .eq('player_id', id);
  if (stamps) {
    const byYear: Record<string, number> = {};
    for (const s of stamps) {
      const y = new Date(s.created_at).getUTCFullYear().toString();
      byYear[y] = (byYear[y] || 0) + 1;
    }
    const years = Object.keys(byYear).sort();
    const rinksPerSeason = years.length > 0 ? Math.round(stamps.length / years.length) : 0;
    insights.push({ key: 'rinks_per_season', value: { average: rinksPerSeason, by_year: byYear, total: stamps.length } });
  }

  // Multi-league rate: how many distinct leagues the player has appeared in
  const { data: teamLinks } = await supabaseAdmin
    .from('team_workspaces')
    .select('id, name, league_id')
    .eq('owner_user_id', userId);
  const leagueSet = new Set<string>();
  for (const t of teamLinks || []) {
    if (t.league_id) leagueSet.add(t.league_id);
  }
  insights.push({ key: 'multi_league_rate', value: { distinct_leagues: leagueSet.size, teams_count: teamLinks?.length || 0 } });

  // Career arc: time-since-first-stamp
  if (stamps && stamps.length > 0) {
    const sorted = [...stamps].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const first = new Date(sorted[0].created_at);
    const days = Math.floor((Date.now() - first.getTime()) / (1000 * 60 * 60 * 24));
    insights.push({ key: 'career_arc', value: { first_stamp: first.toISOString(), days_active: days } });
  }

  // Persist to cache
  const validUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  for (const i of insights) {
    await supabaseAdmin
      .from('player_insights')
      .upsert({
        player_id: id, user_id: userId, insight_key: i.key, insight_value: i.value as any,
        computed_at: new Date().toISOString(), valid_until: validUntil,
      }, { onConflict: 'player_id,insight_key' });
  }

  return NextResponse.json({
    player_id: id,
    insights: Object.fromEntries(insights.map((i) => [i.key, i.value])),
    cached: false,
    computed_at: new Date().toISOString(),
  });
}
