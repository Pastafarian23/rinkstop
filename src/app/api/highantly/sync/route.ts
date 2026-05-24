// Manual sync trigger endpoint
// POST /api/highlightly/sync
// Body: { action: 'sync_league' | 'sync_country' | 'sync_all', leagueId?, countryCode? }

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// League registry — defines source priority for each league
// Hierarchy: NHL (1st) > ESPN (2nd) > Highantly (3rd, gap-fill only)
// For non-NHL: Highantly (1st) > ESPN (2nd) > NHL (3rd, fallback)

const LEAGUE_REGISTRY: Record<string, {
  name: string;
  countryCode: string;
  countryName: string;
  // Source priority: which source to trust first
  primarySource: 'highlightly' | 'nhl';
  fallbackSources: ('espn' | 'highlightly' | 'nhl')[];
}> = {
  // NHL LEAGUES — NHL is authoritative, Highantly gap-fill only
  '49291': { name: 'NHL', countryCode: 'US', countryName: 'United States', primarySource: 'nhl', fallbackSources: ['espn', 'highlightly'] },
  
  // COLLEGE HOCKEY — NCAA official source, Highantly secondary
  '218640': { name: 'NCAA', countryCode: 'US', countryName: 'United States', primarySource: 'nhl', fallbackSources: ['espn', 'highlightly'] },
  
  // MINOR PRO — AHL/ECHL use NHL stats, Highantly for schedules
  '50142': { name: 'AHL', countryCode: 'US', countryName: 'United States', primarySource: 'nhl', fallbackSources: ['espn', 'highlightly'] },
  '50993': { name: 'ECHL', countryCode: 'US', countryName: 'United States', primarySource: 'nhl', fallbackSources: ['espn', 'highlightly'] },
  '53546': { name: 'USHL', countryCode: 'US', countryName: 'United States', primarySource: 'highlightly', fallbackSources: ['nhl'] },
  
  // WOMENS — PWHL primary source
  '54397': { name: 'PWHL', countryCode: 'US', countryName: 'United States', primarySource: 'highlightly', fallbackSources: ['nhl'] },
  
  // NON-NHL INTERNATIONAL — Highantly is primary
  '40781': { name: 'SHL', countryCode: 'SE', countryName: 'Sweden', primarySource: 'highlightly', fallbackSources: ['espn'] },
  '40632': { name: 'HockeyAllsvenskan', countryCode: 'SE', countryName: 'Sweden', primarySource: 'highlightly', fallbackSources: [] },
  '40832': { name: 'Liiga', countryCode: 'FI', countryName: 'Finland', primarySource: 'highlightly', fallbackSources: [] },
  '40595': { name: 'KHL', countryCode: 'RU', countryName: 'Russia', primarySource: 'highlightly', fallbackSources: [] },
  '40759': { name: 'DEL', countryCode: 'DE', countryName: 'Germany', primarySource: 'highlightly', fallbackSources: [] },
  '40881': { name: 'National League', countryCode: 'CH', countryName: 'Switzerland', primarySource: 'highlightly', fallbackSources: [] },
  '40586': { name: 'Extraliga', countryCode: 'CZ', countryName: 'Czech Republic', primarySource: 'highlightly', fallbackSources: [] },
  '40765': { name: 'ICE Hockey League', countryCode: 'AT', countryName: 'Austria', primarySource: 'highlightly', fallbackSources: [] },
  '40618': { name: 'EIHL', countryCode: 'GB', countryName: 'United Kingdom', primarySource: 'highlightly', fallbackSources: [] },
  '40683': { name: 'Metal Ligaen', countryCode: 'DK', countryName: 'Denmark', primarySource: 'highlightly', fallbackSources: [] },
  '40659': { name: 'Eliteserien', countryCode: 'NO', countryName: 'Norway', primarySource: 'highlightly', fallbackSources: [] },
  '41182': { name: 'OHL', countryCode: 'CA', countryName: 'Canada', primarySource: 'nhl', fallbackSources: ['espn', 'highlightly'] },
  '41188': { name: 'WHL', countryCode: 'CA', countryName: 'Canada', primarySource: 'nhl', fallbackSources: ['espn', 'highlightly'] },
};

export async function POST(request: NextRequest) {
  if (!supabaseServiceKey) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 500 });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await request.json();
    const { action, leagueId, countryCode } = body;

    if (!process.env.HIGHLIGHTLY_API_KEY) {
      return NextResponse.json({ error: 'HIGHLIGHTLY_API_KEY not configured' }, { status: 500 });
    }

    const results: any[] = [];

    if (action === 'sync_league' && leagueId) {
      const result = await syncLeagueData(leagueId, supabaseAdmin);
      results.push({ leagueId, ...result });
    } else if (action === 'sync_country' && countryCode) {
      for (const [id, info] of Object.entries(LEAGUE_REGISTRY)) {
        if (info.countryCode === countryCode) {
          const result = await syncLeagueData(id, supabaseAdmin);
          results.push({ leagueId: id, ...result });
          await new Promise(r => setTimeout(r, 500));
        }
      }
    } else if (action === 'sync_all') {
      for (const [id, info] of Object.entries(LEAGUE_REGISTRY)) {
        const result = await syncLeagueData(id, supabaseAdmin);
        results.push({ leagueId: id, leagueName: info.name, ...result });
        await new Promise(r => setTimeout(r, 500));
      }
    }

    return NextResponse.json({
      success: true,
      synced: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function syncLeagueData(leagueId: string, supabaseAdmin: any): Promise<any> {
  const leagueInfo = LEAGUE_REGISTRY[leagueId];
  if (!leagueInfo) {
    return { success: false, error: 'Unknown league ID' };
  }

  const headers = {
    'x-rapidapi-key': process.env.HIGHLIGHTLY_API_KEY!,
    'x-rapidapi-host': 'hockey-highlights-api.p.rapidapi.com',
  };

  let apiCalls = 0;
  let synced = 0;
  let failed = 0;

  try {
    // 1. Sync standings
    const standingsRes = await fetch(
      `https://hockey.highlightly.net/standings?leagueId=${leagueId}&limit=30`,
      { headers }
    );
    apiCalls++;

    if (standingsRes.ok) {
      const standingsJson = await standingsRes.json();
      const standings = standingsJson.data || [];

      for (const entry of standings) {
        const teamData = entry.team || entry;
        const teamId = entry.team?.id || entry.teamId;

        const { error } = await supabaseAdmin
          .from('highlightly_standings')
          .upsert({
            id: `${leagueId}-${teamId}-${entry.season || 'current'}`,
            league_id: leagueId,
            league_name: leagueInfo.name,
            season: entry.season || '2025',
            rank: entry.rank,
            team_id: String(teamId),
            team_name: teamData?.name,
            team_logo: teamData?.logo,
            played: entry.played,
            wins: entry.wins,
            losses: entry.losses,
            overtime_losses: entry.overtimeLosses || 0,
            points: entry.points,
            goals_for: entry.goalsFor,
            goals_against: entry.goalsAgainst,
            last_synced: new Date().toISOString(),
          }, { onConflict: 'id' });

        if (error) failed++;
        else synced++;
      }
    }

    // 2. Sync teams
    const teamsRes = await fetch(
      `https://hockey.highlightly.net/teams?leagueId=${leagueId}&limit=50`,
      { headers }
    );
    apiCalls++;

    if (teamsRes.ok) {
      const teamsJson = await teamsRes.json();
      const teams = teamsJson.data || [];

      for (const team of teams) {
        const { error } = await supabaseAdmin
          .from('highlightly_teams')
          .upsert({
            id: String(team.id),
            name: team.name,
            short_name: team.shortName,
            logo: team.logo,
            country_code: team.country?.code || leagueInfo.countryCode,
            league_id: leagueId,
            league_name: leagueInfo.name,
            last_synced: new Date().toISOString(),
          }, { onConflict: 'id' });

        if (error) failed++;
        else synced++;
      }
    }

    // 3. Sync recent matches
    const matchesRes = await fetch(
      `https://hockey.highlightly.net/matches?leagueId=${leagueId}&limit=10`,
      { headers }
    );
    apiCalls++;

    if (matchesRes.ok) {
      const matchesJson = await matchesRes.json();
      const matches = matchesJson.data || [];

      for (const match of matches) {
        const { error } = await supabaseAdmin
          .from('highlightly_matches')
          .upsert({
            id: String(match.id),
            date: match.date,
            status: match.state?.description,
            home_team_id: String(match.homeTeam?.id),
            home_team_name: match.homeTeam?.name,
            home_team_logo: match.homeTeam?.logo,
            away_team_id: String(match.awayTeam?.id),
            away_team_name: match.awayTeam?.name,
            away_team_logo: match.awayTeam?.logo,
            home_score: match.state?.score?.current?.split(' - ')[0],
            away_score: match.state?.score?.current?.split(' - ')[1],
            period: match.state?.clock,
            league_id: leagueId,
            league_name: leagueInfo.name,
            country_code: match.country?.code || leagueInfo.countryCode,
            last_synced: new Date().toISOString(),
          }, { onConflict: 'id' });

        if (error) failed++;
        else synced++;
      }
    }

    return { success: true, apiCalls, synced, failed };

  } catch (error: any) {
    return { success: false, error: error.message, apiCalls, synced, failed };
  }
}

// GET endpoint to check sync status
export async function GET() {
  if (!supabaseServiceKey) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 500 });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { count: leagues } = await supabaseAdmin
      .from('highlightly_leagues')
      .select('*', { count: 'exact', head: true });

    const { count: teams } = await supabaseAdmin
      .from('highlightly_teams')
      .select('*', { count: 'exact', head: true });

    const { count: standings } = await supabaseAdmin
      .from('highlightly_standings')
      .select('*', { count: 'exact', head: true });

    const { count: matches } = await supabaseAdmin
      .from('highlightly_matches')
      .select('*', { count: 'exact', head: true });

    const { data: latestSync } = await supabaseAdmin
      .from('highlightly_sync_log')
      .select('*')
      .order('synced_at', { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      status: 'connected',
      counts: { leagues, teams, standings, matches },
      latestSync,
      registrySize: Object.keys(LEAGUE_REGISTRY).length,
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}