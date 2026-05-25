import { NextRequest, NextResponse } from 'next/server';

const NHL_BASE = 'https://nhl.highlightly.net';
const API_KEY = process.env.HIGHLIGHTLY_API_KEY || '***REMOVED***';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const limit = searchParams.get('limit') || '10';
  const offset = searchParams.get('offset') || '0';
  const homeTeamName = searchParams.get('homeTeamName');
  const awayTeamName = searchParams.get('awayTeamName');
  const matchId = searchParams.get('matchId');
  const date = searchParams.get('date');
  const leagueName = searchParams.get('leagueName') || 'NHL';
  
  // Build query params
  const params = new URLSearchParams();
  params.append('limit', limit);
  params.append('offset', offset);
  if (homeTeamName) params.append('homeTeamName', homeTeamName);
  if (awayTeamName) params.append('awayTeamName', awayTeamName);
  if (matchId) params.append('matchId', matchId);
  if (date) params.append('date', date);
  params.append('leagueName', leagueName);
  
  try {
    const url = `${NHL_BASE}/highlights?${params.toString()}`;
    const res = await fetch(url, {
      headers: {
        'x-rapidapi-key': API_KEY,
        'x-rapidapi-host': 'nhl-ncaah-api.p.rapidapi.com'
      },
      next: { revalidate: 60 } // Cache for 60 seconds
    });
    
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch highlights' }, { status: res.status });
    }
    
    const data = await res.json();
    
    // Transform highlights to include more useful info
    const highlights = (data.data || []).map((h: any) => ({
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
    
    return NextResponse.json({
      highlights,
      pagination: data.pagination,
      plan: data.plan,
    });
  } catch (error) {
    console.error('Highlights API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}