import { NextResponse } from 'next/server';

const NHL_HIGHLIGHTLY_BASE = 'https://nhl.highlightly.net';
const RAPID_API_KEY = process.env.HIGHLIGHTLY_API_KEY;
if (!RAPID_API_KEY) throw new Error('HIGHLIGHTLY_API_KEY is not set');
const RAPID_API_HOST = 'nhl-highcaah-api.p.rapidapi.com';

interface HighlightlyGame {
  id: number;
  date: string;
  round: string;
  homeTeam: { abbreviation: string; name: string; displayName: string };
  awayTeam: { abbreviation: string; name: string; displayName: string };
  state: {
    clock: number;
    period: number;
    report: string;
    description: string;
    score: {
      current: string;
      firstPeriod: string | null;
      secondPeriod: string | null;
      thirdPeriod: string | null;
      overtimePeriod: string | null;
    };
  };
}

async function fetchHighlightly(path: string): Promise<any> {
  const url = `${NHL_HIGHLIGHTLY_BASE}${path}`;
  const res = await fetch(url, {
    headers: {
      'X-RapidAPI-Key': RAPID_API_KEY,
      'X-RapidAPI-Host': RAPID_API_HOST,
    },
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`highlightly error: ${res.status}`);
  return res.json();
}

function parseScore(score: string): { home: number; away: number } {
  const parts = score.split('-').map((s) => parseInt(s.trim()) || 0);
  return { home: parts[0] || 0, away: parts[1] || 0 };
}

function periodDisplay(game: HighlightlyGame): string {
  const { period, score, report } = game.state;
  if (report === 'Scheduled') return '';
  if (report === 'Final') return 'FINAL';
  const periods = ['Pre-Game', '1st', '2nd', '3rd', 'OT', 'SO'];
  const name = periods[period] || `P${period}`;
  // Use period scores if available
  const p1 = score.firstPeriod;
  const p2 = score.secondPeriod;
  const p3 = score.thirdPeriod;
  if (p1 && p2 && p3) return `${name} ${p1} · ${p2} · ${p3}`;
  return name;
}

export async function GET() {
  try {
    const data = await fetchHighlightly('/matches?limit=20');

    const games: HighlightlyGame[] = data.data || [];
    const now = new Date();

    // Separate live, completed, and upcoming
    const live = games.filter(
      (g) => g.state.report === 'In Progress' || g.state.report === 'In progress'
    );
    const completed = games.filter((g) => g.state.report === 'Final');
    const upcoming = games.filter((g) => g.state.report === 'Scheduled');

    // Sort: live first, then upcoming by date ascending, then recent completed
    const sortedUpcoming = [...upcoming].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const sortedCompleted = [...completed].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    type TickerItem = {
      id: string;
      type: 'final' | 'live' | 'upcoming';
      homeAbbr: string;
      homeName: string;
      awayAbbr: string;
      awayName: string;
      homeScore?: number;
      awayScore?: number;
      periodDisplay?: string;
      seriesLabel?: string;
      date?: string;
      round?: string;
    };

    const items: TickerItem[] = [];

    // Live games first
    for (const g of live) {
      const score = parseScore(g.state.score.current);
      items.push({
        id: `live-${g.id}`,
        type: 'live',
        homeAbbr: g.homeTeam.abbreviation,
        homeName: g.homeTeam.name,
        awayAbbr: g.awayTeam.abbreviation,
        awayName: g.awayTeam.name,
        homeScore: score.home,
        awayScore: score.away,
        periodDisplay: periodDisplay(g),
        round: g.round,
      });
    }

    // Then upcoming (next 4)
    for (const g of sortedUpcoming.slice(0, 4)) {
      items.push({
        id: `upcoming-${g.id}`,
        type: 'upcoming',
        homeAbbr: g.homeTeam.abbreviation,
        homeName: g.homeTeam.name,
        awayAbbr: g.awayTeam.abbreviation,
        awayName: g.awayTeam.name,
        date: g.date,
        round: g.round,
      });
    }

    // Then recent completed (last 6)
    for (const g of sortedCompleted.slice(0, 6)) {
      const score = parseScore(g.state.score.current);
      items.push({
        id: `final-${g.id}`,
        type: 'final',
        homeAbbr: g.homeTeam.abbreviation,
        homeName: g.homeTeam.name,
        awayAbbr: g.awayTeam.abbreviation,
        awayName: g.awayTeam.name,
        homeScore: score.home,
        awayScore: score.away,
        periodDisplay: periodDisplay(g),
        round: g.round,
      });
    }

    // Duplicate for seamless loop
    const allItems = [...items, ...items];
    return NextResponse.json(allItems, {
      headers: { 'Cache-Control': 'public, max-age=5, s-maxage=10, stale-while-revalidate=30' }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}