import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';

// 2026-10-14: server-side module data for /directory/games/[id].
// Each module is a small query that the page (and the sitemap)
// can call.  Wrapped in unstable_cache with per-tier revalidate
// so the same data can be reused across requests.
//
// Tier revalidate values match the [id] page tier:
//   - in_progress: 30s   (live)
//   - scheduled:   5 min (next 7 days) / 1 hour (further out)
//   - completed:   24 hours

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export type GameStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'postponed';

export function tierForStatus(status: GameStatus | undefined, scheduledAt: string | undefined): number {
  if (!status) return 3600;
  if (status === 'in_progress') return 30;
  if (status === 'completed' || status === 'cancelled') return 86400;
  if (status === 'scheduled' || status === 'postponed') {
    if (!scheduledAt) return 3600;
    const minutesUntil = (new Date(scheduledAt).getTime() - Date.now()) / 60000;
    if (minutesUntil < 0) return 30;
    if (minutesUntil < 60 * 24 * 7) return 300;
    return 3600;
  }
  return 3600;
}

// -- Team form ---------------------------------------------------------
// Last 15 completed games for a team in the same league.

export interface FormRow {
  id: string;
  date: string;
  opponent: string;
  result: 'W' | 'L' | 'OTL';
  score: string;
  home_away: 'home' | 'away';
}

export interface TeamForm {
  record: { w: number; l: number; otl: number };
  last5: FormRow[];
}

export async function getTeamForm(leagueId: string | null | undefined, teamId: string | null | undefined, status: GameStatus, scheduledAt: string): Promise<TeamForm | null> {
  if (!leagueId || !teamId) return null;
  if (status === 'cancelled' || status === 'postponed') return null;
  const tier = tierForStatus(status, scheduledAt);
  const fetchImpl = unstable_cache(
    async (): Promise<TeamForm | null> => {
      try {
        const sb = getSupabase();
        const { data: recent } = await sb
          .from('fixtures')
          .select('id, scheduled_at, home_team_id, away_team_id, home_score, away_score, status, home_team:teams!home_team_id(name), away_team:teams!away_team_id(name)')
          .eq('league_id', leagueId)
          .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
          .eq('status', 'completed')
          .order('scheduled_at', { ascending: false })
          .limit(15);
        if (!recent || recent.length === 0) return null;
        let w = 0, l = 0, otl = 0;
        const last5: FormRow[] = [];
        for (const m of recent.slice(0, 5)) {
          const isHome = m.home_team_id === teamId;
          const myScore = isHome ? m.home_score : m.away_score;
          const theirScore = isHome ? m.away_score : m.home_score;
          const oppName = isHome ? m.away_team?.[0]?.name : m.home_team?.[0]?.name;
          let result: 'W' | 'L' | 'OTL' = 'OTL';
          if (myScore !== null && theirScore !== null) {
            if (myScore > theirScore) result = 'W';
            else if (myScore < theirScore) result = 'L';
          }
          if (result === 'W') w++;
          else if (result === 'L') l++;
          else otl++;
          last5.push({
            id: m.id,
            date: (m.scheduled_at || '').slice(0, 10),
            opponent: oppName || '?',
            result,
            score: `${myScore ?? '–'}-${theirScore ?? '–'}`,
            home_away: isHome ? 'home' : 'away',
          });
        }
        return { record: { w, l, otl }, last5 };
      } catch {
        return null;
      }
    },
    ['team-form', leagueId, teamId],
    { revalidate: tier, tags: ['game-module'] }
  );
  return fetchImpl();
}

// -- H2H ---------------------------------------------------------------

export interface H2HRow {
  id: string;
  date: string;
  home_team_name: string;
  away_team_name: string;
  home_score: number | null;
  away_score: number | null;
  winner: 'home' | 'away' | 'tie' | null;
}

export async function getH2H(leagueId: string | null, homeId: string | null, awayId: string | null, excludeId: string, status: GameStatus, scheduledAt: string): Promise<H2HRow[]> {
  if (!leagueId || !homeId || !awayId) return [];
  if (status === 'cancelled' || status === 'postponed') return [];
  const tier = tierForStatus(status, scheduledAt);
  const fetchImpl = unstable_cache(
    async (): Promise<H2HRow[]> => {
      try {
        const sb = getSupabase();
        const { data: rows } = await sb
          .from('fixtures')
          .select('id, scheduled_at, home_team_id, away_team_id, home_score, away_score, status, home_team:teams!home_team_id(name), away_team:teams!away_team_id(name)')
          .eq('league_id', leagueId)
          .or(`and(home_team_id.eq.${homeId},away_team_id.eq.${awayId}),and(home_team_id.eq.${awayId},away_team_id.eq.${homeId})`)
          .eq('status', 'completed')
          .neq('id', excludeId)
          .order('scheduled_at', { ascending: false })
          .limit(5);
        return (rows || []).map((m: any) => {
          let winner: H2HRow['winner'] = null;
          if (m.home_score !== null && m.away_score !== null) {
            if (m.home_score > m.away_score) winner = 'home';
            else if (m.away_score > m.home_score) winner = 'away';
            else winner = 'tie';
          }
          return {
            id: m.id,
            date: (m.scheduled_at || '').slice(0, 10),
            home_team_name: m.home_team?.[0]?.name || '?',
            away_team_name: m.away_team?.[0]?.name || '?',
            home_score: m.home_score,
            away_score: m.away_score,
            winner,
          };
        });
      } catch {
        return [];
      }
    },
    ['h2h', leagueId, homeId, awayId, excludeId],
    { revalidate: tier, tags: ['game-module'] }
  );
  return fetchImpl();
}

// -- Next game ---------------------------------------------------------

export interface NextGame {
  id: string;
  scheduled_at: string;
  status: GameStatus;
  home_team_name: string;
  away_team_name: string;
  home_team_slug: string;
  away_team_slug: string;
  league_slug: string;
  league_name: string;
}

export async function getNextGame(leagueId: string | null, teamId: string | null, afterIso: string, status: GameStatus, scheduledAt: string): Promise<NextGame | null> {
  if (!leagueId || !teamId) return null;
  if (status === 'cancelled' || status === 'postponed') return null;
  const tier = tierForStatus(status, scheduledAt);
  const fetchImpl = unstable_cache(
    async (): Promise<NextGame | null> => {
      try {
        const sb = getSupabase();
        const { data: rows } = await sb
          .from('fixtures')
          .select('id, scheduled_at, status, home_team_id, away_team_id, home_team:teams!home_team_id(name, slug), away_team:teams!away_team_id(name, slug), league:leagues(slug, name)')
          .eq('league_id', leagueId)
          .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
          .gt('scheduled_at', afterIso)
          .in('status', ['scheduled', 'in_progress'])
          .order('scheduled_at', { ascending: true })
          .limit(1);
        const m = (rows || [])[0];
        if (!m) return null;
        return {
          id: m.id,
          scheduled_at: m.scheduled_at,
          status: m.status,
          home_team_name: m.home_team?.[0]?.name || '?',
          away_team_name: m.away_team?.[0]?.name || '?',
          home_team_slug: m.home_team?.[0]?.slug || '',
          away_team_slug: m.away_team?.[0]?.slug || '',
          league_slug: m.league?.[0]?.slug || '',
          league_name: m.league?.[0]?.name || '',
        };
      } catch {
        return null;
      }
    },
    ['next-game', leagueId, teamId, afterIso],
    { revalidate: tier, tags: ['game-module'] }
  );
  return fetchImpl();
}

// -- Same-day games ----------------------------------------------------

export interface SameDayGame {
  id: string;
  scheduled_at: string;
  status: GameStatus;
  home_team_name: string;
  away_team_name: string;
  home_team_slug: string;
  away_team_slug: string;
  home_score: number | null;
  away_score: number | null;
}

export async function getSameDayGames(leagueId: string | null, dayStart: string, dayEnd: string, excludeId: string, status: GameStatus, scheduledAt: string): Promise<SameDayGame[]> {
  if (!leagueId) return [];
  if (status === 'cancelled' || status === 'postponed') return [];
  const tier = tierForStatus(status, scheduledAt);
  const fetchImpl = unstable_cache(
    async (): Promise<SameDayGame[]> => {
      try {
        const sb = getSupabase();
        const { data: rows } = await sb
          .from('fixtures')
          .select('id, scheduled_at, status, home_team_id, away_team_id, home_score, away_score, home_team:teams!home_team_id(name, slug), away_team:teams!away_team_id(name, slug)')
          .eq('league_id', leagueId)
          .gte('scheduled_at', dayStart)
          .lt('scheduled_at', dayEnd)
          .neq('id', excludeId)
          .order('scheduled_at', { ascending: true })
          .limit(20);
        return (rows || []).map((m: any) => ({
          id: m.id,
          scheduled_at: m.scheduled_at,
          status: m.status,
          home_team_name: m.home_team?.[0]?.name || '?',
          away_team_name: m.away_team?.[0]?.name || '?',
          home_team_slug: m.home_team?.[0]?.slug || '',
          away_team_slug: m.away_team?.[0]?.slug || '',
          home_score: m.home_score,
          away_score: m.away_score,
        }));
      } catch {
        return [];
      }
    },
    ['same-day', leagueId, dayStart, dayEnd, excludeId],
    { revalidate: tier, tags: ['game-module'] }
  );
  return fetchImpl();
}
