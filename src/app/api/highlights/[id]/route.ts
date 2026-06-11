import { NextRequest, NextResponse } from 'next/server';
import { mapTeamForHighlights } from '@/lib/highlights-helpers';

const NHL_BASE = 'https://nhl.highlightly.net';
const HOCKEY_BASE = 'https://hockey.highlightly.net';
const API_KEY = process.env.HIGHLIGHTLY_API_KEY;
if (!API_KEY) throw new Error('HIGHLIGHTLY_API_KEY is not set');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const highlightId = parseInt(id);
  if (isNaN(highlightId)) {
    return NextResponse.json({ error: 'Invalid highlight ID' }, { status: 400 });
  }

  try {
    // Try NHL endpoint first
    let data: any = null;
    let found = false;

    const nhlRes = await fetch(`${NHL_BASE}/highlights?limit=100&offset=0`, {
      headers: {
        'x-rapidapi-key': API_KEY,
        'x-rapidapi-host': 'nhl-ncaah-api.p.rapidapi.com'
      },
      next: { revalidate: 60 }
    });
    if (nhlRes.ok) {
      const nhlData = await nhlRes.json();
      const foundHL = (nhlData.data || []).find((h: any) => h.id === highlightId);
      if (foundHL) {
        data = foundHL;
        found = true;
      }
    }

    if (!found) {
      // Try hockey endpoint
      const hockeyRes = await fetch(`${HOCKEY_BASE}/highlights?limit=100&offset=0`, {
        headers: {
          'x-rapidapi-key': API_KEY,
          'x-rapidapi-host': 'hockey-highlights-api.p.rapidapi.com'
        },
        next: { revalidate: 60 }
      });
      if (hockeyRes.ok) {
        const hockeyData = await hockeyRes.json();
        const foundHL = (hockeyData.data || []).find((h: any) => h.id === highlightId);
        if (foundHL) {
          data = foundHL;
          found = true;
        }
      }
    }

    if (!found || !data) {
      return NextResponse.json({ error: 'Highlight not found' }, { status: 404 });
    }

    const highlight = {
      id: data.id,
      title: data.title,
      description: data.description,
      type: data.type,
      url: data.url,
      embedUrl: data.embedUrl,
      imageUrl: data.imgUrl,
      source: data.source,
      channel: data.channel,
      match: {
        id: data.match?.id,
        league: data.match?.league,
        season: data.match?.season,
        date: data.match?.date,
        round: data.match?.round,
        homeTeam: data.match?.homeTeam ? {
          id: data.match.homeTeam.id,
          name: data.match.homeTeam.name,
          displayName: data.match.homeTeam.displayName,
          abbreviation: data.match.homeTeam.abbreviation,
          logo: data.match.homeTeam.logo,
        } : null,
        awayTeam: data.match?.awayTeam ? {
          id: data.match.awayTeam.id,
          name: data.match.awayTeam.name,
          displayName: data.match.awayTeam.displayName,
          abbreviation: data.match.awayTeam.abbreviation,
          logo: data.match.awayTeam.logo,
        } : null,
      },
    };

    return NextResponse.json({ highlight });
  } catch (error) {
    console.error('Highlight API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
