import { NextRequest, NextResponse } from 'next/server';

const NHL_BASE = 'https://nhl.highlightly.net';
const HOCKEY_BASE = 'https://hockey.highlightly.net';
const API_KEY = process.env.HIGHLIGHTLY_API_KEY || '***REMOVED***';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const limit = searchParams.get('limit') || '10';
  const offset = searchParams.get('offset') || '0';
  const homeTeamName = searchParams.get('homeTeamName');
  const awayTeamName = searchParams.get('awayTeamName');
  const matchId = searchParams.get('matchId');
  const date = searchParams.get('date');
  const leagueName = searchParams.get('leagueName');
  const youtubeOnly = searchParams.get('youtubeOnly') === 'true';
  
  // Determine which API base to use based on league
  // NHL and NCAA leagues use nhl.highlightly.net, everything else uses hockey.highlightly.net
  const isNHL = !leagueName || leagueName.toUpperCase() === 'NHL' || leagueName.toUpperCase() === 'NCAAH' || leagueName.toUpperCase() === 'NHL/NCAAH';
  const BASE_URL = isNHL ? NHL_BASE : HOCKEY_BASE;
  const RAPIDAPI_HOST = isNHL ? 'nhl-ncaah-api.p.rapidapi.com' : 'hockey-highlights-api.p.rapidapi.com';
  
  // Build query params
  const params = new URLSearchParams();
  params.append('limit', limit);
  params.append('offset', offset);
  if (homeTeamName) params.append('homeTeamName', homeTeamName);
  if (awayTeamName) params.append('awayTeamName', awayTeamName);
  if (matchId) params.append('matchId', matchId);
  if (date) params.append('date', date);
  if (leagueName) params.append('leagueName', leagueName);
  
  try {
    const url = `${BASE_URL}/highlights?${params.toString()}`;
    const res = await fetch(url, {
      headers: {
        'x-rapidapi-key': API_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST
      },
      next: { revalidate: 60 }
    });
    
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch highlights' }, { status: res.status });
    }
    
    const data = await res.json();
    
    // Filter to YouTube-only server-side when requested (avoids client-side DNS issues with ESPN)
    const all = (data.data || []).map((h: any) => ({
      id: h.id,
      title: h.title,
      description: h.description || '',
      type: h.type,
      url: h.url,
      embedUrl: h.embedUrl,
      imageUrl: h.imgUrl,
      source: h.source,
      channel: h.channel,
      match: {
        id: h.match?.id,
        league: h.match?.league,
        season: h.match?.season,
        date: h.match?.date,
        round: h.match?.round,
        homeTeam: h.match?.homeTeam ? {
          id: h.match.homeTeam.id,
          name: h.match.homeTeam.name,
          displayName: h.match.homeTeam.displayName,
          abbreviation: h.match.homeTeam.abbreviation,
          logo: h.match.homeTeam.logo,
        } : null,
        awayTeam: h.match?.awayTeam ? {
          id: h.match.awayTeam.id,
          name: h.match.awayTeam.name,
          displayName: h.match.awayTeam.displayName,
          abbreviation: h.match.awayTeam.abbreviation,
          logo: h.match.awayTeam.logo,
        } : null,
      },
    }));

    const highlights = youtubeOnly
      ? all.filter((h: any) => h.source === 'youtube' || !!h.embedUrl)
      : all;

    return NextResponse.json({
      highlights,
      pagination: youtubeOnly
        ? { totalCount: highlights.length, offset: parseInt(offset), limit: parseInt(limit) }
        : data.pagination,
      plan: data.plan,
    });
  } catch (error) {
    console.error('Highlights API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}