// Test endpoint for highlightly integration
// GET /api/highlightly/test

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const apiKey = process.env.HIGHLIGHTLY_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      status: 'not_configured',
      message: 'HIGHLIGHTLY_API_KEY not set in environment',
    }, { status: 200 });
  }

  try {
    const headers = {
      'x-rapidapi-key': apiKey,
      'x-rapidapi-host': 'hockey-highlights-api.p.rapidapi.com',
    };

    // Test leagues
    const leaguesRes = await fetch(
      'https://hockey.highlightly.net/leagues?countryCode=SE&limit=5',
      { headers }
    );
    const leaguesJson = await leaguesRes.json();
    const leagues = leaguesJson.data || [];

    // Test matches for SHL
    const matchesRes = await fetch(
      'https://hockey.highlightly.net/matches?leagueId=40781&limit=3',
      { headers }
    );
    const matchesJson = await matchesRes.json();
    const matches = matchesJson.data || [];

    // Test teams
    const teamsRes = await fetch(
      'https://hockey.highlightly.net/teams?leagueId=40781&limit=5',
      { headers }
    );
    const teamsJson = await teamsRes.json();
    const teams = teamsJson.data || [];

    return NextResponse.json({
      status: 'connected',
      apiKeyPrefix: apiKey.substring(0, 8) + '...',
      tests: {
        leagues: {
          success: true,
          count: leagues.length,
          sample: leagues.slice(0, 2).map((l: any) => ({
            id: l.id,
            name: l.name,
            countryCode: l.country?.code,
          })),
        },
        matches: {
          success: true,
          count: matches.length,
          sample: matches.slice(0, 2).map((m: any) => ({
            id: m.id,
            homeTeam: m.homeTeam?.name,
            awayTeam: m.awayTeam?.name,
            status: m.state?.description,
            date: m.date,
            score: m.state?.score?.current,
          })),
        },
        teams: {
          success: true,
          count: teams.length,
          sample: teams.slice(0, 2).map((t: any) => ({
            id: t.id,
            name: t.name,
            logo: t.logo ? 'yes' : 'no',
          })),
        },
      },
      priorityRules: {
        nhlCore: 'NHL priority 1 — teams, schedules, scores, standings, rosters, stats',
        espn: 'ESPN priority 2 — headlines, recaps, summaries, backup display',
        highlightly: 'Highlightly priority 3 — non-NHL; NHL gap-fill only',
        rinkstop: 'RinkStop priority 1 — facilities, rinks, arenas, addresses, contact info',
      },
    });

  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      message: error.message,
      code: error.code || 'UNKNOWN',
    }, { status: 500 });
  }
}