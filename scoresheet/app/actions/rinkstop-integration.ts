'use server';

/**
 * Server actions for RinkStop integration (Phase B).
 *
 * The "Submit to RinkStop" flow:
 *   1. User finishes scoring a game in the scoresheet app.
 *   2. Taps "Submit to RinkStop" on game settings.
 *   3. We find the best matching fixture in rinkstop.com's DB
 *      (home_team_id + away_team_id + scheduled_at within ±24h).
 *   4. If exactly one match: auto-link. If multiple: present candidates.
 *   5. If none: present "no match found" with a manual pick.
 *
 * States (in games.rinkstop_integration column):
 *   off        : no integration attempt yet
 *   pending    : user clicked submit, waiting for match
 *   linked     : linked to a specific rinkstop_fixture_id
 *   submitted  : final results written back to rinkstop.com
 *   posted     : a rinkstop.com news article was generated from the result
 *
 * Phase B1 ships the link step. Phase B4 ships the result-write-back step.
 */

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { getServerSupabase } from '@/lib/supabase';

export type ActionResult<T = void> =
  | (T extends void ? { ok: true } : { ok: true } & T)
  | { ok: false; error: string };

interface FixtureMatch {
  id: string;
  home_team_id: string;
  away_team_id: string;
  scheduled_at: string;
  status: string;
  league_id: string | null;
  home_team_name: string | null;
  away_team_name: string | null;
  score: { home: number | null; away: number | null };
  match_score: number;
  match_reasons: string[];
}

/**
 * Search rinkstop fixtures for matches to this scoresheet game.
 *
 * Match scoring (rough):
 *   +50 home_team_id matches (strong)
 *   +50 away_team_id matches (strong)
 *   +30 scheduled_at within ±1 hour (strong)
 *   +15 scheduled_at within ±6 hours (medium)
 *   +5  scheduled_at within ±24 hours (weak)
 *   +20 both teams match (huge)
 *   +10 league_id matches one of the teams' leagues
 */
export async function findFixtureMatchesAction(
  gameId: string
): Promise<ActionResult<{ matches: FixtureMatch[]; searchedBy: string }>> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: 'Not signed in.' };
  const sb = getServerSupabase();
  if (!sb) return { ok: false, error: 'Database unavailable.' };

  // Load the scoresheet game.
  const { data: game, error: gErr } = await sb
    .from('games')
    .select('*')
    .eq('id', gameId)
    .maybeSingle();
  if (gErr || !game) return { ok: false, error: 'Game not found.' };
  if ((game as any).owner_user_id !== userId) return { ok: false, error: 'Not your game.' };
  const g = game as any;

  // Resolve the team IDs.
  const homeId = g.home_team_rinkstop_id as string | null;
  const awayId = g.away_team_rinkstop_id as string | null;
  const searchedBy = homeId && awayId
    ? `team IDs ${homeId.slice(0, 8)} + ${awayId.slice(0, 8)}`
    : g.home_team_name + ' vs ' + g.away_team_name;

  // If we have team IDs, query fixtures directly. Otherwise we'd need
  // to do a fuzzy text match on team_workspaces — for Phase B1, require
  // the user to link teams first.
  if (!homeId || !awayId) {
    return {
      ok: true,
      matches: [],
      searchedBy: searchedBy + ' (no rinkstop team links — link teams first)',
    };
  }

  // Date window: ±48 hours around the game.
  const gameDate = g.scheduled_at || g.started_at;
  if (!gameDate) {
    return { ok: true, matches: [], searchedBy: searchedBy + ' (no scheduled/started date)' };
  }
  const center = new Date(gameDate);
  const low = new Date(center.getTime() - 48 * 60 * 60 * 1000).toISOString();
  const high = new Date(center.getTime() + 48 * 60 * 60 * 1000).toISOString();

  const { data: fixtures, error: fErr } = await sb
    .from('fixtures')
    .select('id, home_team_id, away_team_id, league_id, scheduled_at, status, home_score, away_score')
    .or(`home_team_id.eq.${homeId},away_team_id.eq.${homeId},home_team_id.eq.${awayId},away_team_id.eq.${awayId}`)
    .gte('scheduled_at', low)
    .lte('scheduled_at', high)
    .order('scheduled_at', { ascending: true })
    .limit(50);

  if (fErr) return { ok: false, error: 'Fixture search failed.' };

  // Hydrate team names for the matches.
  const teamIds = Array.from(new Set((fixtures || []).flatMap((f) => [f.home_team_id, f.away_team_id])));
  let teamMap = new Map<string, { name: string; league_id: string | null }>();
  if (teamIds.length > 0) {
    const { data: teams } = await sb
      .from('team_workspaces')
      .select('id, name, league_id')
      .in('id', teamIds);
    for (const t of teams || []) {
      teamMap.set(t.id, { name: t.name, league_id: t.league_id });
    }
  }

  // Score each fixture.
  const matches: FixtureMatch[] = [];
  for (const f of fixtures || []) {
    let score = 0;
    const reasons: string[] = [];
    if (f.home_team_id === homeId) { score += 50; reasons.push('home team match'); }
    if (f.away_team_id === awayId) { score += 50; reasons.push('away team match'); }
    if (f.home_team_id === awayId && f.away_team_id === homeId) {
      // The teams are swapped in the fixture vs the game. Plausible
      // but needs manual confirmation.
      score += 30;
      reasons.push('teams swapped (manual check)');
    }
    if (f.home_team_id === homeId && f.away_team_id === awayId) {
      score += 20;
      reasons.push('exact match');
    }
    const fxDate = new Date(f.scheduled_at).getTime();
    const gDateMs = center.getTime();
    const diffH = Math.abs(fxDate - gDateMs) / (60 * 60 * 1000);
    if (diffH <= 1) { score += 30; reasons.push('time within 1h'); }
    else if (diffH <= 6) { score += 15; reasons.push('time within 6h'); }
    else if (diffH <= 24) { score += 5; reasons.push('time within 24h'); }
    else { reasons.push(`time off by ${diffH.toFixed(0)}h`); }

    matches.push({
      id: f.id,
      home_team_id: f.home_team_id,
      away_team_id: f.away_team_id,
      scheduled_at: f.scheduled_at,
      status: f.status,
      league_id: f.league_id,
      home_team_name: teamMap.get(f.home_team_id)?.name || null,
      away_team_name: teamMap.get(f.away_team_id)?.name || null,
      score: { home: f.home_score, away: f.away_score },
      match_score: score,
      match_reasons: reasons,
    });
  }

  matches.sort((a, b) => b.match_score - a.match_score);
  return { ok: true, matches: matches.slice(0, 10), searchedBy };
}

/**
 * Link the scoresheet game to a specific rinkstop fixture.
 * Sets rinkstop_integration = 'linked' and rinkstop_fixture_id.
 */
export async function linkToFixtureAction(
  gameId: string,
  fixtureId: string
): Promise<ActionResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: 'Not signed in.' };
  const sb = getServerSupabase();
  if (!sb) return { ok: false, error: 'Database unavailable.' };

  // Verify ownership.
  const { data: game } = await sb.from('games').select('id, owner_user_id').eq('id', gameId).maybeSingle();
  if (!game) return { ok: false, error: 'Game not found.' };
  if ((game as any).owner_user_id !== userId) return { ok: false, error: 'Not your game.' };

  // Verify fixture exists.
  const { data: fixture } = await sb.from('fixtures').select('id').eq('id', fixtureId).maybeSingle();
  if (!fixture) return { ok: false, error: 'Fixture not found.' };

  const { error } = await sb
    .from('games')
    .update({
      rinkstop_fixture_id: fixtureId,
      rinkstop_integration: 'linked',
    })
    .eq('id', gameId);
  if (error) return { ok: false, error: 'Failed to link fixture.' };

  revalidatePath(`/scoresheet/${gameId}`);
  return { ok: true };
}

/**
 * Unlink. Sets rinkstop_integration = 'off' and clears fixture_id.
 */
export async function unlinkFixtureAction(gameId: string): Promise<ActionResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: 'Not signed in.' };
  const sb = getServerSupabase();
  if (!sb) return { ok: false, error: 'Database unavailable.' };

  const { data: game } = await sb.from('games').select('id, owner_user_id').eq('id', gameId).maybeSingle();
  if (!game) return { ok: false, error: 'Game not found.' };
  if ((game as any).owner_user_id !== userId) return { ok: false, error: 'Not your game.' };

  const { error } = await sb
    .from('games')
    .update({ rinkstop_fixture_id: null, rinkstop_integration: 'off' })
    .eq('id', gameId);
  if (error) return { ok: false, error: 'Failed to unlink.' };

  revalidatePath(`/scoresheet/${gameId}`);
  return { ok: true };
}
