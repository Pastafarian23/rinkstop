// NHL/NCAAH Sync API Route
// Uses highlightly.net API (correct spelling: highlightly with 'y')
// Docs: https://highlightly.net/nhl-api/documentation/

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const HIGHLIGHTLY_API_KEY = process.env.HIGHLIGHTLY_API_KEY;
const NHL_BASE_URL = 'https://nhl.highlightly.net';

let apiCallsToday = 0;

interface SyncResult {
  synced: number;
  failed: number;
  errors: string[];
}

async function fetchAPI<T>(endpoint: string): Promise<T> {
  const url = `${NHL_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    headers: {
      'x-rapidapi-key': HIGHLIGHTLY_API_KEY || '',
      'Content-Type': 'application/json',
    },
  });

  apiCallsToday++;

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`${response.status}: ${errText}`);
  }

  const json = await response.json();
  if (json.data) return json.data as T;
  if (Array.isArray(json)) return json as T;
  throw new Error(`Unexpected response: ${JSON.stringify(json).slice(0, 100)}`);
}

// 1. Sync all NHL and NCAA teams
async function syncTeams(): Promise<{ nhl: number; ncaa: number; errors: string[] }> {
  const result = { nhl: 0, ncaa: 0, errors: [] };
  
  const teams = await fetchAPI<any[]>('/teams');
  console.log(`[Sync] Total teams from API: ${teams.length}`);

  for (const team of teams) {
    try {
      const leagueId = team.league === 'NHL' ? 'NHL' : 'NCAA';
      const leagueName = team.league === 'NHL' ? 'NHL' : 'NCAA';
      
      const { error } = await supabaseAdmin
        .from('nhl_teams')
        .upsert({
          id: String(team.id),
          name: team.displayName || team.name,
          short_name: team.abbreviation,
          logo: team.logo,
          country_code: 'US',
          league_id: leagueId,
          league_name: leagueName,
          last_synced: new Date().toISOString(),
        }, { onConflict: 'id' });

      if (error) throw error;
      if (team.league === 'NHL') result.nhl++;
      else result.ncaa++;
    } catch (error: any) {
      result.errors.push(`Team ${team.id}: ${error.message}`);
    }
  }

  return result;
}

// 2. Sync standings (NHL and NCAA conferences)
async function syncStandings(): Promise<{ synced: number; errors: string[] }> {
  const result = { synced: 0, errors: [] };
  
  const standingsData = await fetchAPI<any[]>('/standings');
  console.log(`[Sync] Standing groups: ${standingsData.length}`);

  for (const conference of standingsData) {
    const leagueName = conference.leagueName;
    const leagueType = conference.leagueType; // 'NCAA' or 'NHL'
    const season = String(conference.year);
    const entries = conference.data || [];

    console.log(`[Sync] ${leagueName} (${leagueType}): ${entries.length} teams in standings`);

    for (const entry of entries) {
      const teamData = entry.team || {};
      const teamId = String(teamData.id || 'unknown');

      try {
        const stats = entry.statistics || [];
        
        // Extract common stats from statistics array
        const getStat = (displayName: string) => {
          const s = stats.find((st: any) => st.displayName === displayName);
          return s?.value || null;
        };

        const standingId = `${leagueName}-${teamData.id || 'unknown'}-${season}`.replace(/\s+/g, '_');

        const { error } = await supabaseAdmin
          .from('nhl_standings')
          .upsert({
            id: standingId,
            league_id: leagueType === 'NHL' ? 'NHL' : 'NCAA',
            league_name: leagueName,
            season,
            rank: entry.rank || getStat('Rank') || null,
            team_id: teamId,
            team_name: teamData.displayName || teamData.name,
            team_logo: teamData.logo,
            played: parseInt(getStat('Games Played') || '0'),
            wins: parseInt(getStat('Wins') || getStat('W') || '0'),
            losses: parseInt(getStat('Losses') || getStat('L') || '0'),
            overtime_losses: parseInt(getStat('Overtime Losses') || getStat('OT') || '0'),
            points: parseInt(getStat('Points') || getStat('PTS') || '0'),
            goals_for: parseInt(getStat('Goals For') || getStat('GF') || '0'),
            goals_against: parseInt(getStat('Goals Against') || getStat('GA') || '0'),
            last_synced: new Date().toISOString(),
          }, { onConflict: 'id' });

        if (error) throw error;
        result.synced++;
      } catch (error: any) {
        result.errors.push(`Standing ${leagueName} team ${teamId}: ${error.message}`);
      }
    }
  }

  return result;
}

// 3. Sync recent matches
async function syncMatches(limit: number = 50): Promise<{ synced: number; errors: string[] }> {
  const result = { synced: 0, errors: [] };
  
  const matches = await fetchAPI<any[]>('/matches?limit=' + limit);
  console.log(`[Sync] Total matches: ${matches.length}`);

  for (const match of matches) {
    try {
      const homeTeam = match.homeTeam || {};
      const awayTeam = match.awayTeam || {};
      const state = match.state || {};

      const { error } = await supabaseAdmin
        .from('nhl_matches')
        .upsert({
          id: String(match.id),
          league: match.league,
          season: String(match.season),
          date: match.date,
          round: match.round,
          status: state.description || state.report || 'Unknown',
          home_team_id: String(homeTeam.id),
          home_team_name: homeTeam.displayName || homeTeam.name,
          home_team_logo: homeTeam.logo,
          away_team_id: String(awayTeam.id),
          away_team_name: awayTeam.displayName || awayTeam.name,
          away_team_logo: awayTeam.logo,
          home_score: state.score?.current?.split(' - ')[0] || null,
          away_score: state.score?.current?.split(' - ')[1] || null,
          period: state.period,
          clock: state.clock,
          last_synced: new Date().toISOString(),
        }, { onConflict: 'id' });

      if (error) throw error;
      result.synced++;
    } catch (error: any) {
      result.errors.push(`Match ${match.id}: ${error.message}`);
    }
  }

  return result;
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const syncType = searchParams.get('type') || 'all';

    const results = {
      success: true,
      teams: { nhl: 0, ncaa: 0 },
      standings: 0,
      matches: 0,
      apiCallsUsed: 0,
      details: [] as string[],
      errors: [] as string[],
    };

    // Sync teams
    if (syncType === 'all' || syncType === 'teams') {
      const teamsResult = await syncTeams();
      results.teams = { nhl: teamsResult.nhl, ncaa: teamsResult.ncaa };
      results.details.push(`Teams: ${teamsResult.nhl} NHL, ${teamsResult.ncaa} NCAA`);
      results.errors.push(...teamsResult.errors);
    }

    // Sync standings
    if (syncType === 'all' || syncType === 'standings') {
      const standingsResult = await syncStandings();
      results.standings = standingsResult.synced;
      results.details.push(`Standings: ${standingsResult.synced} entries`);
      results.errors.push(...standingsResult.errors);
    }

    // Sync matches
    if (syncType === 'all' || syncType === 'matches') {
      const matchesResult = await syncMatches(50);
      results.matches = matchesResult.synced;
      results.details.push(`Matches: ${matchesResult.synced} games`);
      results.errors.push(...matchesResult.errors);
    }

    results.apiCallsUsed = apiCallsToday;

    return NextResponse.json({ message: 'Full sync completed', ...results });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'teams';
  const league = searchParams.get('league');

  try {
    if (type === 'teams') {
      let query = supabaseAdmin.from('nhl_teams').select('*', { count: 'exact' });
      if (league) query = query.eq('league_name', league);
      const { data, count, error } = await query.order('name');
      if (error) throw error;
      return NextResponse.json({ count, teams: data?.map((t: any) => ({ id: t.id, name: t.name, league_name: t.league_name })) || [] });
    }

    if (type === 'standings') {
      let query = supabaseAdmin.from('nhl_standings').select('*', { count: 'exact' });
      if (league) query = query.eq('league_name', league);
      const { data, count, error } = await query.order('rank');
      if (error) throw error;
      return NextResponse.json({ count, standings: data || [] });
    }

    if (type === 'matches') {
      let query = supabaseAdmin.from('nhl_matches').select('*', { count: 'exact' });
      if (league) query = query.eq('league', league);
      const { data, count, error } = await query.order('date', { ascending: false }).limit(20);
      if (error) throw error;
      return NextResponse.json({ count, matches: data || [] });
    }

    return NextResponse.json({ error: 'Unknown type' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}