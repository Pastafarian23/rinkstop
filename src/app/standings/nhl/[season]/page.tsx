import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllSeasons, getLatestSeason, getStandingsForSeason, NhlStanding } from '@/lib/nhl-data';
import { ALL_CONFERENCES, ALL_DIVISIONS, NHL_TEAMS_CANONICAL, NhlTeamCanonical } from '@/lib/nhl-teams-canonical';
import NhlStandingsClient from './client';

export const revalidate = 3600; // 1 hour

export async function generateStaticParams() {
  const seasons = await getAllSeasons();
  return seasons.map((s) => ({ season: s }));
}

export async function generateMetadata({ params }: { params: Promise<{ season: string }> }): Promise<Metadata> {
  const { season } = await params;
  return {
    title: `NHL ${formatSeason(season)} Standings | RinkStop`,
    description: `Final NHL ${formatSeason(season)} standings by conference and division. Records, points, and goal differentials for all 32 teams.`,
  };
}

function resolveCanonical(teamName: string): NhlTeamCanonical | undefined {
  if (!teamName) return undefined;
  const norm = teamName.toLowerCase().trim();
  // Map data-side names that drift from canonical (e.g. team rebrands).
  // The data uses nicknames/short names; the canonical map uses official names.
  // Keeping the slug stable means the team page URL doesn't change.
  const ALIASES: Record<string, string> = {
    'utah mammoth': 'utah-hockey-club',  // 2025-26 rebrand — data uses "Mammoth" identity
    'arizona coyotes': 'utah-hockey-club',  // 2024 relocation — pre-2025 the franchise was Arizona
    'utah': 'utah-hockey-club',
    'arizona': 'utah-hockey-club',
    // Note: 'Brantford Bulldogs' is intentionally NOT aliased — it's an OHL
    // team that got mis-synced into nhl_standings for 2023-24 and 2024-25.
    // Leaving the row dropped is the safest behavior. See TODO.md "Data Integrity".
  };
  if (ALIASES[norm]) {
    return NHL_TEAMS_CANONICAL.find(t => t.slug === ALIASES[norm]);
  }
  return NHL_TEAMS_CANONICAL.find(t => t.name.toLowerCase() === norm);
}

function formatSeason(s: string): string {
  const yr = parseInt(s);
  if (isNaN(yr)) return s;
  return `${yr}-${String((yr + 1) % 100).padStart(2, '0')}`;
}

export default async function NhlSeasonStandingsPage({
  params,
}: {
  params: Promise<{ season: string }>;
}) {
  const { season } = await params;
  const allSeasons = await getAllSeasons();
  const latestSeason = await getLatestSeason();

  if (!allSeasons.includes(season)) {
    notFound();
  }

  const standings = await getStandingsForSeason(season);
  const isLatest = season === latestSeason;

  // Build per-division and per-conference groupings.
  // We attach division from the canonical map (nhl_standings has no division field).
  const enriched = standings.map((s) => {
    const c = resolveCanonical(s.team_name);
    return { ...s, _division: c?.division ?? null, _conference: c?.conference ?? null };
  });

  const easternAtlantic = enriched.filter(t => t._division === 'Atlantic');
  const easternMetro = enriched.filter(t => t._division === 'Metropolitan');
  const westernCentral = enriched.filter(t => t._division === 'Central');
  const westernPacific = enriched.filter(t => t._division === 'Pacific');

  // Wild-card (top 3 per division are auto-qualified; wild cards are next 2 per conference).
  // Simpler model: just mark divisional top-3 with green dot for visual.
  function markQualifiers(rows: NhlStanding[]): (NhlStanding & { qualified?: boolean })[] {
    return rows.map((r, i) => ({ ...r, qualified: i < 3 }));
  }

  return (
    <NhlStandingsClient
      season={season}
      seasonLabel={formatSeason(season)}
      isLatest={isLatest}
      allSeasons={allSeasons}
      eastern={{
        Atlantic: markQualifiers(easternAtlantic),
        Metropolitan: markQualifiers(easternMetro),
      }}
      western={{
        Central: markQualifiers(westernCentral),
        Pacific: markQualifiers(westernPacific),
      }}
    />
  );
}
