// Standings module — computes live standings from completed fixtures.
/**
 * compute-standings.ts
 *
 * Computes live league standings from completed fixtures in the database.
 *
 * Dedup: one row per real game via (home_team_id, away_team_id, date) +
 * external_id (nhl_game_id, highlightly_id, hl_match_id) when present.
 * Prefer row with higher external_id (HL is authoritative source).
 *
 * Points: 2 pts/win, 1 pt OT/SO loss (NHL/AHL/ECHL). Tie: 0 or 1 configurable.
 * Tie-breaking: pts desc → gd desc → gf desc → wins desc.
 *
 * Only teams that appear in completed fixtures are shown.
 * Games with no team match are silently skipped.
 */

import { supabaseAdmin } from '@/lib/supabase';

export interface StandingEntry {
  rank: number;
  team_id: string;
  team_name: string;
  team_slug: string;
  team_logo: string | null;
  gp: number;
  w: number;
  l: number;
  otl: number;
  pts: number;
  gf: number;
  ga: number;
  gd: number;
  streak: string;
  last10: { w: number; l: number; otl: number };
  // null for non-OT leagues
  tie: number | null;
  division: string | null;
  conference: string | null;
}

export interface StandingsResult {
  league_id: string;
  league_name: string;
  season: string;
  generated_at: string;
  entries: StandingEntry[];
  note: string;
}

// [win_pts, ot_loss_pts, tie_pts] — null = league uses no OT/ties
type PointsConfig = [number, number, number] | null;

const LEAGUE_POINTS: Record<string, PointsConfig> = {
  '2b5f2b9d-84b9-4edb-8373-a732b72f4e40': [2, 1, 0], // NHL
};

const DEFAULT_POINTS: PointsConfig = [2, 1, 0];

function leaguePoints(leagueId: string): PointsConfig {
  return LEAGUE_POINTS[leagueId] ?? DEFAULT_POINTS;
}

/**
 * Pick one fixture per real game.
 * Two rows are the same game if they share (home, away, date).
 * When both have external_ids: keep the one with the larger id (more recent write).
 * When only one has an external_id: prefer the one with one.
 */
function dedupFixtures(fixtures: any[]): any[] {
  const best = new Map<string, any>();
  for (const f of fixtures) {
    const extId =
      f.game_data?.nhl_game_id ??
      f.game_data?.highlightly_id ??
      f.game_data?.hl_match_id ??
      f.game_data?.external_game_id ??
      null;
    const gameDate = (f.scheduled_at ?? '').slice(0, 10);
    const homeId = f.home_team_id;
    const awayId = f.away_team_id;
    if (!homeId || !awayId) continue;
    const key = `${homeId}|${awayId}|${gameDate}`;
    const prev = best.get(key);
    const prevExt =
      prev?.game_data?.nhl_game_id ??
      prev?.game_data?.highlightly_id ??
      prev?.game_data?.hl_match_id ??
      prev?.game_data?.external_game_id ??
      null;
    if (!prev) {
      best.set(key, { ...f, _ext: extId });
    } else if (extId !== null && prevExt === null) {
      best.set(key, { ...f, _ext: extId });
    } else if (extId !== null && prevExt !== null && String(extId) > String(prevExt)) {
      best.set(key, { ...f, _ext: extId });
    }
  }
  return Array.from(best.values());
}

/** Detect whether a finished game went to OT or shootout (loser gets 1pt). */
function hadOt(gameData: any): boolean {
  if (!gameData) return false;
  // NHL.com: lastPeriodType = 'OT' or 'SO'
  const lpt = gameData?.gameOutcome?.lastPeriodType;
  if (lpt === 'OT' || lpt === 'SO') return true;
  // HL: periodDescriptor.number > 3
  const periods = gameData?.periodDescriptor?.number;
  if (periods != null && periods > 3) return true;
  return false;
}

export async function computeStandings(
  leagueId: string,
  season: string,
): Promise<StandingsResult> {
  const { supabaseAdmin: sb } = await import('@/lib/supabase');
  const ptsCfg = leaguePoints(leagueId);

  // League name
  const { data: league } = await sb
    .from('leagues')
    .select('id, name')
    .eq('id', leagueId)
    .maybeSingle();

  // All completed fixtures for this league+season
  const PAGE = 2000;
  let off = 0;
  const raw: any[] = [];
  for (;;) {
    const { data, error } = await sb
      .from('fixtures')
      .select(
        'id, home_team_id, away_team_id, home_score, away_score, scheduled_at, status, game_data',
      )
      .eq('league_id', leagueId)
      .eq('status', 'completed')
      .eq('season', season)
      .range(off, off + PAGE - 1);
    if (error) throw error;
    if (!data?.length) break;
    raw.push(...data);
    if (data.length < PAGE) break;
    off += PAGE;
  }

  const fixtures = dedupFixtures(raw);
  if (!fixtures.length) {
    return {
      league_id: leagueId,
      league_name: league?.name ?? '',
      season,
      generated_at: new Date().toISOString(),
      entries: [],
      note: 'Standings calculated from results on RinkStop.',
    };
  }

  // Collect all team IDs
  const tids = new Set<string>();
  for (const f of fixtures) {
    if (f.home_team_id) tids.add(f.home_team_id);
    if (f.away_team_id) tids.add(f.away_team_id);
  }

  // Team metadata — fixtures use team_workspace IDs, NOT teams table IDs
  const { data: teamsRaw } = await sb
    .from('teams')
    .select('id, name, slug, logo_url, division, is_active')
    .in('id', Array.from(tids));
  const teamMap = new Map((teamsRaw ?? []).map((t: any) => [t.id, t]));

  interface TStats {
    gp: number;
    w: number;
    l: number;
    otl: number;
    tie: number;
    gf: number;
    ga: number;
    // last10: push one entry per game, newest last
    last10: string[];
  }
  const stats = new Map<string, TStats>();
  function st(tid: string) {
    if (!stats.has(tid)) stats.set(tid, { gp: 0, w: 0, l: 0, otl: 0, tie: 0, gf: 0, ga: 0, last10: [] });
    return stats.get(tid)!;
  }

  // Sort by time so last10 is chronological
  const sorted = [...fixtures].sort(
    (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime(),
  );

  for (const f of sorted) {
    const h = f.home_team_id, a = f.away_team_id;
    const hs = f.home_score, as = f.away_score;
    if (hs == null || as == null) continue;

    const hWin = hs > as, aWin = as > hs;
    const tie = hs === as;
    const ot = hadOt(f.game_data);

    // home
    const sh = st(h);
    sh.gp++; sh.gf += hs; sh.ga += as;
    if (tie) { sh.tie++; sh.last10.push('T'); }
    else if (hWin) { sh.w++; sh.last10.push('W'); }
    else { sh.l++; if (ot) sh.otl++; sh.last10.push(ot ? 'OTL' : 'L'); }

    // away
    const sa = st(a);
    sa.gp++; sa.gf += as; sa.ga += hs;
    if (tie) { sa.tie++; sa.last10.push('T'); }
    else if (aWin) { sa.w++; sa.last10.push('W'); }
    else { sa.l++; if (ot) sa.otl++; sa.last10.push(ot ? 'OTL' : 'L'); }
  }

  const entries: StandingEntry[] = [];
  for (const [tid, s] of stats) {
    if (s.gp === 0) continue;
    const t = teamMap.get(tid);

    const last10 = s.last10.slice(-10);
    const l10w = last10.filter(r => r === 'W').length;
    const l10l = last10.filter(r => r === 'L' || r === 'OTL').length;
    const l10otl = last10.filter(r => r === 'OTL').length;

    // Streak: most recent game result
    const last = s.last10[s.last10.length - 1] ?? null;
    let streak = '-';
    if (last) {
      if (last === 'W' || last === 'L' || last === 'OTL') {
        let streakLen = 1;
        for (let i = s.last10.length - 2; i >= 0; i--) {
          if (s.last10[i] === last) streakLen++;
          else break;
        }
        const char = last === 'OTL' ? 'L' : last;
        streak = `${char}${streakLen}`;
      } else {
        streak = 'T1';
      }
    }

    const [winPts, otlPts, tiePts] = ptsCfg ?? [2, 1, 0];
    const pts = s.w * winPts + s.otl * otlPts + s.tie * tiePts;

    entries.push({
      rank: 0,
      team_id: tid,
      team_name: t?.name ?? tid,
      team_slug: t?.slug ?? '',
      team_logo: t?.logo_url ?? null,
      gp: s.gp,
      w: s.w,
      l: s.l,
      otl: s.otl,
      pts,
      gf: s.gf,
      ga: s.ga,
      gd: s.gf - s.ga,
      streak,
      last10: { w: l10w, l: l10l, otl: l10otl },
      tie: ptsCfg === null ? null : s.tie,
      division: t?.division ?? null,

    });
  }

  entries.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.gd !== a.gd) return b.gd - a.gd;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return b.w - a.w;
  });

  entries.forEach((e, i) => { e.rank = i + 1; });

  return {
    league_id: leagueId,
    league_name: league?.name ?? '',
    season,
    generated_at: new Date().toISOString(),
    entries,
    note: 'Standings calculated from results on RinkStop.',
  };
}
