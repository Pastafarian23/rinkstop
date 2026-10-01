import { supabase } from '@/lib/supabase';

/**
 * Standings reader — server-side fetch from highlightly_standings table.
 *
 * 2026-10-01: extracted from the inline /standings page logic so we can
 * use the same reader from both the index page and the per-season page.
 * Replaces the previous approach of streaming the season page data
 * directly through getStandingsForSeason (which only handles NHL).
 *
 * Schema (highlightly_standings):
 *   id              string  e.g. "5890-2050843-2025" (league_id-team_id-season)
 *   league_id       string  HL numeric league ID
 *   league_name     string  HL human-readable league name
 *   season          string  e.g. "2025" (calendar year season start)
 *   rank            number
 *   team_id         string  HL team ID (NOT a Supabase team UUID)
 *   team_name       string
 *   team_logo       string  URL
 *   played          number  GP
 *   wins            number  W
 *   losses          number  L
 *   overtime_losses number  OTL
 *   points          number  PTS
 *   goals_for       number  GF
 *   goals_against   number  GA
 *   last_synced     string  ISO timestamp
 *
 * NOTE: team_id is the HL league-specific ID (e.g. 2050843 for LNAH
 * National Quebec), NOT our internal team_workspaces.id. For league
 * pages like /standings/nhl, we still need resolveCanonical from
 * nhl-teams-canonical.ts to map team_name → our internal slug.
 *
 * The /standings index page just shows the table; team-page linking
 * is best-effort (we don't have a full HL-id → DB-uuid mapping).
 */

export interface StandingRow {
  id: string;
  league_id: string;
  league_name: string;
  season: string;
  rank: number | null;
  team_id: string;
  team_name: string;
  team_logo: string | null;
  played: number | null;
  wins: number | null;
  losses: number | null;
  overtime_losses: number | null;
  points: number | null;
  goals_for: number | null;
  goals_against: number | null;
  last_synced: string | null;
}

export interface StandingsFilter {
  /** League name to filter by, e.g. 'NHL'. Null = all leagues. */
  league?: string | null;
  /** Season (4-digit year), e.g. '2025'. Null = all seasons. */
  season?: string | null;
  /** League level: 'pro' | 'junior' | 'college' | 'international' | 'minor' | 'amateur'. Null = all levels. */
  level?: string | null;
  /** Group rows by league after fetching. Default true. */
  groupByLeague?: boolean;
}

/**
 * League classification — maps HL league names to UI levels for the
 * filter bar. Hard-coded from the league catalog used elsewhere in the
 * codebase (see src/lib/score-chips.ts).
 *
 * NOTE: when adding a league to this map, also add it to /directory/*
 * if it's not already there so the directory pages link back.
 */
const LEAGUE_LEVELS: Record<string, 'pro' | 'junior' | 'college' | 'international' | 'minor' | 'amateur'> = {
  // Pro
  'NHL': 'pro', 'AHL': 'pro', 'ECHL': 'pro', 'PWHL': 'pro', 'PWHL Women': 'pro',
  'KHL': 'pro', 'VHL': 'pro', 'MHL': 'pro',
  'SHL': 'pro', 'Hockey Allsvenskan': 'pro',
  'Liiga': 'pro', 'Mestis': 'pro',
  'DEL': 'pro', 'DEL2': 'pro', 'Oberliga': 'pro', 'Oberliga Nord': 'pro', 'Oberliga Süd': 'pro',
  'ICE Hockey League': 'pro', 'Alps Hockey League': 'pro',
  'National League': 'pro', 'Swiss League': 'pro', 'MySports League': 'pro',
  'Extraliga': 'pro', 'Chance Liga': 'pro', '1. Liga': 'pro', '2. Liga': 'pro',
  'Extraliga (CZ)': 'pro',
  'Ligue Magnus': 'pro', 'Serie A': 'pro',
  'Metal Ligaen': 'pro', '1. divisjon': 'pro', 'Fjordkraft-ligaen': 'pro',
  'Optibet hokeja līga': 'pro',
  'Erste Liga': 'pro',
  'Elite League': 'pro',
  'Champions Hockey League': 'pro',
  'Hokiliiga': 'pro', 'Suomi-sarja': 'pro',
  'Süper Lig': 'pro',
  'Asian Games': 'pro', 'Asia League Ice Hockey': 'pro', 'Hockey 4 Nations Face-Off': 'pro',
  // Junior
  'OHL': 'junior', 'WHL': 'junior', 'QMJHL': 'junior', 'USHL': 'junior',
  'NAHL': 'junior', 'EJHL': 'junior', 'GOJHL': 'junior',
  'U20 SM-sarja': 'junior', 'U20 WJC': 'junior',
  'WCH U20': 'junior', 'WCH U18': 'junior',
  'Hlinka-Gretzky Cup': 'junior', 'World Junior A Challenge': 'junior',
  // College
  'NCAA': 'college', 'U Sports': 'college',
  // Minor pro
  'SPHL': 'minor', 'FPHL': 'minor', 'LNAH': 'minor', 'Ligue Nord-Américaine de Hockey': 'minor',
  'IHL': 'minor',
  'Mestis (FI)': 'minor',
  // International
  'World Championship': 'international', 'WCH Women': 'international',
  'WCH U20 IA': 'international', 'WCH U20 IB': 'international',
  'Olympic Games': 'international', 'Olympic Games - Women': 'international',
  'Friendly International': 'international',
  'IIHF World Championship': 'international',
  'Beijer Hockey Games': 'international', 'Karjala Cup': 'international',
  'Channel One Cup': 'international', 'Czech Hockey Games': 'international',
  'Tatra Cup': 'international',
  // Amateur / lower-tier / regional
  'Continental Cup': 'amateur',
  'SDHL Women': 'amateur', 'NWHL': 'amateur',
  'Memorial Cup': 'amateur', 'World Hockey Challenge U17': 'amateur',
  'WCH IIA': 'amateur', 'WCH IIB': 'amateur', 'WCH IIIA': 'amateur', 'WCH IIIB': 'amateur', 'WCH IV': 'amateur',
  'Challenge Cup': 'amateur',
  'SCA Cupen': 'amateur', 'Slovakia Cup': 'amateur', 'Kazakhstan Cup': 'amateur',
  'Belarusian Cup': 'amateur', 'Romanian Cup': 'amateur',
  'Dutch Cup': 'amateur', 'Polish Cup': 'amateur', 'Italian Cup': 'amateur',
  'Hungarian Cup': 'amateur', 'French Cup': 'amateur', 'Danish Cup': 'amateur',
  'Belgian Cup': 'amateur', 'German Cup': 'amateur', 'Czech Cup': 'amateur',
  'Ukrainian Cup': 'amateur',
};

/** Public helper so other modules (UI chips) can render level labels consistently. */
export function getLeagueLevel(leagueName: string): 'pro' | 'junior' | 'college' | 'international' | 'minor' | 'amateur' | 'unknown' {
  return LEAGUE_LEVELS[leagueName] ?? 'unknown';
}

const LEVEL_LABELS: Record<string, string> = {
  pro: 'Professional',
  junior: 'Junior',
  college: 'College',
  international: 'International',
  minor: 'Minor Pro',
  amateur: 'Amateur',
  unknown: 'Other',
};

export function levelLabel(level: string): string {
  return LEVEL_LABELS[level] ?? 'Other';
}

/**
 * Fetch standings rows matching the given filter.
 *
 * Returns rows sorted by:
 *   1. league_name ASC
 *   2. season DESC (newest first within a league)
 *   3. rank ASC (top of league first within a season)
 */
export async function fetchStandings(filter: StandingsFilter = {}): Promise<StandingRow[]> {
  const { league, season, level, groupByLeague = true } = filter;

  let query = supabase
    .from('highlightly_standings')
    .select('*')
    .order('league_name', { ascending: true })
    .order('season', { ascending: false })
    .order('rank', { ascending: true });

  if (league) query = query.eq('league_name', league);
  if (season) query = query.eq('season', season);

  const { data, error } = await query;
  if (error) {
    console.error('[standings] fetch failed:', error.message);
    return [];
  }

  let rows = (data || []) as StandingRow[];

  // Level filter is post-fetch (since LEAGUE_LEVELS is JS, not DB).
  if (level) {
    rows = rows.filter(r => LEAGUE_LEVELS[r.league_name] === level);
  }

  if (groupByLeague) {
    // No-op for the sort itself; UI groups client-side. We sort here so
    // the array is already grouped when rendered.
  }

  return rows;
}

/**
 * Get distinct leagues + season lists for the filter bar UI.
 * Returns a stable shape so the UI doesn't have to re-derive everything.
 */
export async function fetchStandingsFacets(): Promise<{
  leagues: string[];
  seasons: string[];
  levels: string[];
}> {
  const { data, error } = await supabase
    .from('highlightly_standings')
    .select('league_name, season');
  if (error || !data) {
    return { leagues: [], seasons: [], levels: [] };
  }

  const leagueSet = new Set<string>();
  const seasonSet = new Set<string>();
  for (const r of data) {
    if (r.league_name) leagueSet.add(r.league_name);
    if (r.season) seasonSet.add(r.season);
  }

  const leagues = [...leagueSet].sort((a, b) => a.localeCompare(b));
  const seasons = [...seasonSet].sort((a, b) => b.localeCompare(a)); // newest first
  const levels = ['pro', 'junior', 'college', 'international', 'minor', 'amateur'];

  return { leagues, seasons, levels };
}

/**
 * Group rows by league_name for rendering. Within each group, sort by
 * season DESC then rank ASC.
 */
export function groupByLeagueName(rows: StandingRow[]): Array<{
  league_name: string;
  level: ReturnType<typeof getLeagueLevel>;
  rows: StandingRow[];
}> {
  const map = new Map<string, StandingRow[]>();
  for (const r of rows) {
    const key = r.league_name;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }
  return [...map.entries()].map(([league_name, rows]) => ({
    league_name,
    level: getLeagueLevel(league_name),
    rows: rows.sort((a, b) => {
      if (a.season !== b.season) return b.season.localeCompare(a.season);
      return (a.rank ?? 99) - (b.rank ?? 99);
    }),
  }));
}