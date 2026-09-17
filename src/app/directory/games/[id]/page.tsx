import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import GamePageClient from './GamePageClient';
import { withDefaultOg } from '@/lib/metadata-defaults';

const BASE_URL = 'https://rinkstop.com';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

async function fetchGame(id: string) {
  const sb = getSupabase();
  const { data: fixture } = await sb
    .from('fixtures')
    .select(`
      id, scheduled_at, status, home_score, away_score, league_id, home_team_id, away_team_id, game_data,
      home_team:teams!fixtures_home_team_id_fkey(id, name, slug, logo_url),
      away_team:teams!fixtures_away_team_id_fkey(id, name, slug, logo_url),
      league:leagues(id, name, slug, level, country)
    `)
    .eq('id', id)
    .maybeSingle();
  return fixture;
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const game = await fetchGame(id);
  if (!game) {
    return {
      title: 'Game Not Found | RinkStop',
      description: 'Hockey game details not available.',
      alternates: { canonical: `${BASE_URL}/directory/games/${id}` },
      robots: { index: false, follow: true },
    };
  }
  const homeName = (game as any).home_team?.name ?? 'Home';
  const awayName = (game as any).away_team?.name ?? 'Away';
  const leagueName = (game as any).league?.name ?? 'Hockey';
  const dateStr = new Date(game.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const title = `${awayName} at ${homeName} — ${dateStr} | ${leagueName}`;
  const description = `${awayName} vs ${homeName} on ${dateStr} in the ${leagueName}. Live score, boxscore, and game details on RinkStop.`;
  const ogImage = (game as any).home_team?.logo_url || `${BASE_URL}/og-image.png`;
  return {
    title,
    description: description.slice(0, 240),
    alternates: { canonical: `${BASE_URL}/directory/games/${id}` },
    robots: { index: true, follow: true },
    openGraph: withDefaultOg({
      title: `${awayName} @ ${homeName}`,
      description,
      url: `${BASE_URL}/directory/games/${id}`,
      siteName: 'RinkStop',
      type: 'article',
      images: [{ url: ogImage, width: 1200, height: 630, alt: `${awayName} at ${homeName}` }],
    }),
    twitter: {
      card: 'summary_large_image',
      title: `${awayName} @ ${homeName}`,
      description,
      images: [ogImage],
    },
  };
}

export default async function GameDetailPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const game = await fetchGame(id);

  if (!game) {
    return <GamePageClient />;
  }

  const homeName = (game as any).home_team?.name ?? 'Home';
  const awayName = (game as any).away_team?.name ?? 'Away';
  const leagueName = (game as any).league?.name ?? 'Hockey';

  const sportsEvent = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: `${homeName} vs ${awayName}`,
    description: `${awayName} at ${homeName} — ${leagueName}`,
    startDate: game.scheduled_at,
    endDate: game.status === 'completed' && game.scheduled_at
      ? new Date(new Date(game.scheduled_at).getTime() + 3 * 60 * 60 * 1000).toISOString()
      : undefined,
    eventStatus: game.status === 'in_progress'
      ? 'https://schema.org/EventLive'
      : game.status === 'completed'
      ? 'https://schema.org/EventCompleted'
      : 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    sport: 'Ice Hockey',
    homeTeam: (game as any).home_team ? {
      '@type': 'SportsTeam',
      name: homeName,
      url: `${BASE_URL}/directory/teams/${(game as any).home_team.slug}`,
    } : undefined,
    awayTeam: (game as any).away_team ? {
      '@type': 'SportsTeam',
      name: awayName,
      url: `${BASE_URL}/directory/teams/${(game as any).away_team.slug}`,
    } : undefined,
    competitor: [
      (game as any).home_team ? { '@type': 'SportsTeam', name: homeName } : undefined,
      (game as any).away_team ? { '@type': 'SportsTeam', name: awayName } : undefined,
    ].filter(Boolean),
    url: `${BASE_URL}/directory/games/${id}`,
    organizer: (game as any).league ? {
      '@type': 'SportsOrganization',
      name: leagueName,
      url: `${BASE_URL}/directory/leagues/${(game as any).league.id}`,
    } : undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(sportsEvent) }}
      />
      <GamePageClient />
    </>
  );
}
