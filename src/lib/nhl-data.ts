// NHL data helpers — fetch from Supabase with caching.
// Used by /directory/nhl/* pages.
//
// We use the service-role (admin) client because the nhl_* tables have RLS enabled
// with no public-read policy. The data here is public highlightly info, so reading
// with elevated privileges is appropriate for a public NHL directory page.
// To switch to anon key later, add a public-read RLS policy to each nhl_* table.

import { supabaseAdmin } from './supabase';

export interface NhlTeamRecord {
  id: string;
  name: string;
  short_name: string | null;
  logo: string | null;
  league_id: string;
  league_name: string;
}

export interface NhlStanding {
  id: string;
  league_name: string;
  season: string;
  rank: number;
  team_id: string;
  team_name: string;
  team_logo: string | null;
  played: number;
  wins: number;
  losses: number;
  overtime_losses: number;
  points: number;
  goals_for: number;
  goals_against: number;
}

export interface NhlMatch {
  id: string;
  date: string;
  status: string;
  home_team_id: string;
  home_team_name: string;
  home_team_logo: string | null;
  home_score: number | null;
  away_team_id: string;
  away_team_name: string;
  away_team_logo: string | null;
  away_score: number | null;
  period: number | null;
  clock: string | null;
  league_name: string;
  venue: string | null;
}

export interface NhlPlayer {
  id: number;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  logo: string | null;
  birth_date: string | null;
  birth_country: string | null;
  birth_place: string | null;
  nationality: string | null;
  height: number | null;
  weight: number | null;
  position: string | null;
  shoots: string | null;
  draft_year: number | null;
  draft_team: string | null;
  draft_round: number | null;
  draft_pick: number | null;
  current_team_id: string | null;
  jersey_number: string | null;
}

// Find NHL team in nhl_teams table by name (canonical → highlightly)
export async function findNhlTeamByName(name: string): Promise<NhlTeamRecord | null> {
  const { data, error } = await supabaseAdmin
    .from('nhl_teams')
    .select('*')
    .eq('league_id', 'NHL')
    .ilike('name', name)
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error('[nhl-data] findNhlTeamByName error:', error.message);
    return null;
  }
  return data as NhlTeamRecord | null;
}

// Get current standings (latest season) for a team.
// IMPORTANT: nhl_standings uses a DIFFERENT ID system than nhl_teams/nhl_matches.
// standings.team_id values are 6-digit (NHL API style), while nhl_teams.id are 1-2 digit (highlightly).
// We match by team_name to bridge the two systems.
export async function getCurrentStandingForTeam(highlightlyId: string, teamName?: string): Promise<NhlStanding | null> {
  // Get latest season first
  const { data: seasonRow } = await supabaseAdmin
    .from('nhl_standings')
    .select('season')
    .order('season', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!seasonRow) return null;
  const latestSeason = (seasonRow as any).season;

  // First, find the team's actual name from nhl_teams (using the highlightly_id)
  let resolvedName = teamName;
  if (!resolvedName) {
    const { data: teamRow } = await supabaseAdmin
      .from('nhl_teams')
      .select('name')
      .eq('id', String(highlightlyId))
      .maybeSingle();
    resolvedName = (teamRow as any)?.name;
  }
  if (!resolvedName) return null;

  const { data, error } = await supabaseAdmin
    .from('nhl_standings')
    .select('*')
    .eq('team_name', resolvedName)
    .eq('season', latestSeason)
    .maybeSingle();
  if (error) {
    console.error('[nhl-data] getCurrentStandingForTeam error:', error.message);
    return null;
  }
  return data as NhlStanding | null;
}

// All standings for a season, paginated
export async function getStandingsForSeason(season: string): Promise<NhlStanding[]> {
  let all: NhlStanding[] = [];
  let from = 0;
  const batch = 1000;
  while (true) {
    const { data, error } = await supabaseAdmin
      .from('nhl_standings')
      .select('*')
      .eq('season', season)
      .order('rank', { ascending: true })
      .range(from, from + batch - 1);
    if (error) {
      console.error('[nhl-data] getStandingsForSeason error:', error.message);
      return [];
    }
    if (!data || data.length === 0) break;
    all = all.concat(data as NhlStanding[]);
    if (data.length < batch) break;
    from += batch;
  }
  return all;
}

// Get latest available season
export async function getLatestSeason(): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('nhl_standings')
    .select('season')
    .order('season', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return (data as any)?.season ?? null;
}

// Get all seasons
export async function getAllSeasons(): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from('nhl_standings')
    .select('season');
  if (error) return [];
  const set = new Set<string>();
  for (const r of (data || [])) set.add((r as any).season);
  return Array.from(set).sort().reverse();
}

// Recent + upcoming games for a team
// nhl_matches uses the SAME ID system as nhl_teams, so highlightlyId works directly.
export async function getTeamRecentGames(highlightlyId: string, limit = 10): Promise<NhlMatch[]> {
  const { data, error } = await supabaseAdmin
    .from('nhl_matches')
    .select('*')
    .or(`home_team_id.eq.${highlightlyId},away_team_id.eq.${highlightlyId}`)
    .order('date', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('[nhl-data] getTeamRecentGames error:', error.message);
    return [];
  }
  return (data || []) as NhlMatch[];
}

export async function getTeamUpcomingGames(highlightlyId: string, limit = 10): Promise<NhlMatch[]> {
  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from('nhl_matches')
    .select('*')
    .or(`home_team_id.eq.${highlightlyId},away_team_id.eq.${highlightlyId}`)
    .gte('date', now)
    .in('status', ['Scheduled', 'Not started'])
    .order('date', { ascending: true })
    .limit(limit);
  if (error) {
    console.error('[nhl-data] getTeamUpcomingGames error:', error.message);
    return [];
  }
  return (data || []) as NhlMatch[];
}

// Top players for a team (by name only until bio is backfilled)
// nhl_players.current_team_id is stored as the SAME highlightly ID as nhl_teams.id for most teams,
// but some entries use the larger NHL-API style ID. We try both, then fall back to name match.
export async function getTeamPlayers(highlightlyId: string, teamName?: string, limit = 20): Promise<NhlPlayer[]> {
  // Try direct ID match first
  let { data, error } = await supabaseAdmin
    .from('nhl_players')
    .select('*')
    .eq('current_team_id', String(highlightlyId))
    .order('full_name', { ascending: true })
    .limit(limit);

  // If empty, try the larger nhl_standings-style ID (we don't know it without a name lookup)
  if ((!data || data.length === 0) && teamName) {
    // Get the alt team_id from standings
    const { data: stRow } = await supabaseAdmin
      .from('nhl_standings')
      .select('team_id')
      .eq('team_name', teamName)
      .limit(1)
      .maybeSingle();
    const altId = (stRow as any)?.team_id;
    if (altId && altId !== String(highlightlyId)) {
      const res = await supabaseAdmin
        .from('nhl_players')
        .select('*')
        .eq('current_team_id', String(altId))
        .order('full_name', { ascending: true })
        .limit(limit);
      data = res.data;
      error = res.error;
    }
  }

  if (error) {
    console.error('[nhl-data] getTeamPlayers error:', error.message);
    return [];
  }
  return (data || []) as NhlPlayer[];
}

// Get a single game by ID
export async function getNhlGameById(gameId: string): Promise<NhlMatch | null> {
  const { data, error } = await supabaseAdmin
    .from('nhl_matches')
    .select('*')
    .eq('id', String(gameId))
    .maybeSingle();
  if (error) return null;
  return data as NhlMatch | null;
}

// Get today's games
export async function getTodaysNhlGames(): Promise<NhlMatch[]> {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
  const { data, error } = await supabaseAdmin
    .from('nhl_matches')
    .select('*')
    .gte('date', startOfDay)
    .lt('date', endOfDay)
    .order('date', { ascending: true });
  if (error) {
    console.error('[nhl-data] getTodaysNhlGames error:', error.message);
    return [];
  }
  return (data || []) as NhlMatch[];
}

// Get games by date (any status)
export async function getNhlGamesByDate(dateIso: string): Promise<NhlMatch[]> {
  const date = new Date(dateIso);
  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
  const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).toISOString();
  const { data, error } = await supabaseAdmin
    .from('nhl_matches')
    .select('*')
    .gte('date', startOfDay)
    .lt('date', endOfDay)
    .order('date', { ascending: true });
  if (error) return [];
  return (data || []) as NhlMatch[];
}

// Build a slug-based URL for a game
export function buildGameSlug(match: NhlMatch): string {
  const date = new Date(match.date).toISOString().slice(0, 10);
  const homeSlug = slugify(match.home_team_name);
  const awaySlug = slugify(match.away_team_name);
  return `${date}-${homeSlug}-vs-${awaySlug}`;
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
