import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// US state abbreviations mapping (slug → abbreviation)
export const US_STATES: Record<string, string> = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR', 'california': 'CA',
  'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE', 'florida': 'FL', 'georgia': 'GA',
  'hawaii': 'HI', 'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA',
  'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
  'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS', 'missouri': 'MO',
  'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV', 'new-hampshire': 'NH', 'new-jersey': 'NJ',
  'new-mexico': 'NM', 'new-york': 'NY', 'north-carolina': 'NC', 'north-dakota': 'ND', 'ohio': 'OH',
  'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA', 'rhode-island': 'RI', 'south-carolina': 'SC',
  'south-dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT', 'vermont': 'VT',
  'virginia': 'VA', 'washington': 'WA', 'west-virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY',
  'district-of-columbia': 'DC',
};

// US state full names (abbreviation → full name)
export const STATE_NAMES: Record<string, string> = {
  'al': 'Alabama', 'ak': 'Alaska', 'az': 'Arizona', 'ar': 'Arkansas', 'ca': 'California',
  'co': 'Colorado', 'ct': 'Connecticut', 'de': 'Delaware', 'fl': 'Florida', 'ga': 'Georgia',
  'hi': 'Hawaii', 'id': 'Idaho', 'il': 'Illinois', 'in': 'Indiana', 'ia': 'Iowa',
  'ks': 'Kansas', 'ky': 'Kentucky', 'la': 'Louisiana', 'me': 'Maine', 'md': 'Maryland',
  'ma': 'Massachusetts', 'mi': 'Michigan', 'mn': 'Minnesota', 'ms': 'Mississippi', 'mo': 'Missouri',
  'mt': 'Montana', 'ne': 'Nebraska', 'nv': 'Nevada', 'nh': 'New Hampshire', 'nj': 'New Jersey',
  'nm': 'New Mexico', 'ny': 'New York', 'nc': 'North Carolina', 'nd': 'North Dakota', 'oh': 'Ohio',
  'ok': 'Oklahoma', 'or': 'Oregon', 'pa': 'Pennsylvania', 'ri': 'Rhode Island', 'sc': 'South Carolina',
  'sd': 'South Dakota', 'tn': 'Tennessee', 'tx': 'Texas', 'ut': 'Utah', 'vt': 'Vermont',
  'va': 'Virginia', 'wa': 'Washington', 'wv': 'West Virginia', 'wi': 'Wisconsin', 'wy': 'Wyoming',
  'dc': 'District of Columbia',
};

// Canadian province abbreviations mapping (slug → abbreviation)
export const CA_PROVINCES: Record<string, string> = {
  'alberta': 'AB', 'british-columbia': 'BC', 'manitoba': 'MB',
  'new-brunswick': 'NB', 'newfoundland-and-labrador': 'NL', 'nova-scotia': 'NS',
  'northwest-territories': 'NT', 'nunavut': 'NU', 'ontario': 'ON',
  'prince-edward-island': 'PE', 'quebec': 'QC', 'saskatchewan': 'SK', 'yukon': 'YT',
  'ab': 'AB', 'bc': 'BC', 'mb': 'MB',
  'nb': 'NB', 'nl': 'NL', 'ns': 'NS',
  'nt': 'NT', 'nu': 'NU', 'on': 'ON',
  'pe': 'PE', 'qc': 'QC', 'sk': 'SK', 'yt': 'YT',
};

export const PROVINCE_NAMES: Record<string, string> = {
  'ab': 'Alberta', 'bc': 'British Columbia', 'mb': 'Manitoba',
  'nb': 'New Brunswick', 'nl': 'Newfoundland and Labrador', 'ns': 'Nova Scotia',
  'nt': 'Northwest Territories', 'nu': 'Nunavut', 'on': 'Ontario',
  'pe': 'Prince Edward Island', 'qc': 'Quebec', 'sk': 'Saskatchewan', 'yt': 'Yukon',
};

// NHL teams by city (for cross-referencing on US city pages)
export const NHL_TEAMS_BY_CITY: Record<string, { name: string; league: string }[]> = {
  'New York': [
    { name: 'New York Rangers', league: 'NHL' },
    { name: 'New York Islanders', league: 'NHL' },
  ],
  'Los Angeles': [{ name: 'Los Angeles Kings', league: 'NHL' }],
  'San Jose': [{ name: 'San Jose Sharks', league: 'NHL' }],
  'Anaheim': [{ name: 'Anaheim Ducks', league: 'NHL' }],
  'Las Vegas': [{ name: 'Vegas Golden Knights', league: 'NHL' }],
  'Seattle': [{ name: 'Seattle Kraken', league: 'NHL' }],
  'Boston': [{ name: 'Boston Bruins', league: 'NHL' }],
  'Chicago': [{ name: 'Chicago Blackhawks', league: 'NHL' }],
  'Detroit': [{ name: 'Detroit Red Wings', league: 'NHL' }],
  'Philadelphia': [{ name: 'Philadelphia Flyers', league: 'NHL' }],
  'Pittsburgh': [{ name: 'Pittsburgh Penguins', league: 'NHL' }],
  'St. Louis': [{ name: 'St. Louis Blues', league: 'NHL' }],
  'Dallas': [{ name: 'Dallas Stars', league: 'NHL' }],
  'Denver': [{ name: 'Colorado Avalanche', league: 'NHL' }],
  'Phoenix': [{ name: 'Arizona Coyotes', league: 'NHL' }],
  'Minneapolis': [{ name: 'Minnesota Wild', league: 'NHL' }],
  'Miami': [{ name: 'Florida Panthers', league: 'NHL' }],
  'Tampa Bay': [{ name: 'Tampa Bay Lightning', league: 'NHL' }],
  'Washington': [{ name: 'Washington Capitals', league: 'NHL' }],
  'Nashville': [{ name: 'Nashville Predators', league: 'NHL' }],
  'Columbus': [{ name: 'Columbus Blue Jackets', league: 'NHL' }],
  'Raleigh': [{ name: 'Carolina Hurricanes', league: 'NHL' }],
  'Buffalo': [{ name: 'Buffalo Sabres', league: 'NHL' }],
  'Newark': [{ name: 'New Jersey Devils', league: 'NHL' }],
  'Jersey City': [{ name: 'New Jersey Devils', league: 'NHL' }],
};

// EIHL teams for UK cross-referencing
export const UK_EIHL_TEAMS: { name: string; city: string; league: string }[] = [
  { name: 'Sheffield Steelers', city: 'Sheffield', league: 'EIHL' },
  { name: 'Cardiff Devils', city: 'Cardiff', league: 'EIHL' },
  { name: 'Nottingham Panthers', city: 'Nottingham', league: 'EIHL' },
  { name: 'Coventry Blaze', city: 'Coventry', league: 'EIHL' },
  { name: 'Belfast Giants', city: 'Belfast', league: 'EIHL' },
  { name: 'Guildford Flames', city: 'Guildford', league: 'EIHL' },
  { name: 'Manchester Storm', city: 'Manchester', league: 'EIHL' },
  { name: 'Milton Keynes Lightning', city: 'Milton Keynes', league: 'EIHL' },
  { name: 'Fife Flyers', city: 'Fife', league: 'EIHL' },
  { name: 'Glasgow Clan', city: 'Glasgow', league: 'EIHL' },
  { name: 'Dundee Stars', city: 'Dundee', league: 'EIHL' },
];

export interface CityTeam {
  id: string;
  name: string;
  slug?: string;
  logo_url?: string;
}

export interface CityRink {
  id: string;
  name: string;
  slug?: string;
  address?: string;
  phone?: string;
  website_url?: string;
  notes?: string;
}

export interface CityPageData {
  // Identity / display
  countryName: string;
  countrySlug: string;
  regionName?: string;
  regionSlug?: string;
  regionAbbr?: string;
  cityName: string;
  citySlug: string;

  // Data
  teams: CityTeam[];
  rinks: CityRink[];
  teamCount: number;
  rinkCount: number;
  /** Youth programs listed in RinkStop's directory for this city. Added
   *  2026-07-07 as part of Tier 1c enrichment — sourced from the live
   *  youth_programs table, country + city match. */
  programCount: number;

  // Leagues present in this city (derived from teams data, with counts)
  leaguesInCity: { name: string; count: number; slug: string }[];

  // Pro cross-reference
  proTeams: { name: string; league: string }[];

  // PR4 (2026-07-08): peer cities in the same state/province with at least
  // one rink or team. Sorted by total (teams + rinks) descending, limit 12.
  // Used by CityPageContent to render an "Other hockey cities in {region}"
  // cross-link section. Empty array when no region context (international
  // city pages) or when no peers exist.
  peerCities: Array<{
    name: string;
    slug: string;
    teamCount: number;
    rinkCount: number;
    href: string;
  }>;

  // Breadcrumb items
  breadcrumb: { name: string; href: string }[];

  // SEO
  title: string;
  description: string;
  canonicalPath: string;
}

/**
 * Convert a slug like "new-york" to "New York".
 *
 * NOTE: slugToTitle cannot perfectly reverse all slugifications because some
 * city names lose information when lowercased + stripped (e.g. "St. Cloud"
 * and "St Cloud" both slugify to "st-cloud"). The CITY_NAME_OVERRIDES map
 * below handles the 4 known cases identified in the 2026-07-07 404 audit
 * (Coeur d'Alene, Sault Ste. Marie, St. Cloud, St. Louis). If new cities
 * with periods/apostrophes are added, append them here.
 */
const CITY_NAME_OVERRIDES: Record<string, string> = {
  'coeur-d-alene': "Coeur d'Alene",
  'sault-ste-marie': 'Sault Ste. Marie',
  'st-cloud': 'St. Cloud',
  'st-louis': 'St. Louis',
};

export function slugToTitle(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Resolve a city slug to its canonical DB display name.
 * Uses CITY_NAME_OVERRIDES for cities where the default slugToTitle() drops
 * information (apostrophes, periods).
 */
export function resolveCityName(slug: string): string {
  return CITY_NAME_OVERRIDES[slug] || slugToTitle(slug);
}

/**
 * Resolve US state slug to abbreviation + full name.
 */
export function resolveUSState(stateSlug: string): { abbr: string; name: string } {
  const abbr = US_STATES[stateSlug] || stateSlug.toUpperCase();
  const name = STATE_NAMES[abbr.toLowerCase()] || abbr;
  return { abbr, name };
}

/**
 * Resolve Canadian province slug to abbreviation + full name.
 * Returns `null` if the input doesn't match a known province.
 */
export function resolveCAProvince(provinceSlug: string): { abbr: string; name: string } | null {
  const abbr = CA_PROVINCES[provinceSlug] || CA_PROVINCES[provinceSlug.toLowerCase()] || provinceSlug.toUpperCase();
  // Verify the result is actually a known province (uppercase, 2 letters, in our map)
  if (abbr.length !== 2 || !PROVINCE_NAMES[abbr.toLowerCase()]) return null;
  const name = PROVINCE_NAMES[abbr.toLowerCase()] || abbr;
  return { abbr, name };
}

/**
 * Find professional team(s) in a city.
 */
export function findProTeamsInCity(cityName: string, countrySlug: string): { name: string; league: string }[] {
  if (countrySlug === 'united-states' || countrySlug === 'usa') {
    return NHL_TEAMS_BY_CITY[cityName] || [];
  }
  if (countrySlug === 'united-kingdom' || countrySlug === 'uk') {
    return UK_EIHL_TEAMS.filter(t => t.city.toLowerCase() === cityName.toLowerCase());
  }
  return [];
}

/**
 * Fetch teams + rinks for a city, with proper query patterns per country.
 */
export async function getCityPageData(opts: {
  countryName: string;
  countrySlug: string;
  cityName: string;
  citySlug: string;
  regionName?: string;
  regionSlug?: string;
  regionAbbr?: string;
}): Promise<CityPageData> {
  const { countryName, countrySlug, cityName, citySlug, regionName, regionSlug, regionAbbr } = opts;
  const proTeams = findProTeamsInCity(cityName, countrySlug);

  // Build breadcrumb
  const breadcrumb: { name: string; href: string }[] = [
    { name: 'Home', href: '/' },
    { name: 'Directory', href: '/directory' },
    { name: countryName, href: `/directory/${countrySlug}` },
  ];
  if (regionName && regionSlug) {
    breadcrumb.push({ name: regionName, href: `/directory/${countrySlug}/${regionSlug}` });
  }
  breadcrumb.push({ name: cityName, href: '' }); // current page

  // Query patterns:
  // - US uses ilike for city on rinks, and city match for teams
  // - CA uses exact match for both
  // - UK uses ilike for both
  let teamsQuery = supabase
    .from('teams')
    .select('id, name, slug, logo_url, league_id')
    .eq('country', countryName)
    .eq('is_active', true);

  let rinksQuery = supabase
    .from('rinks')
    .select('id, name, slug, address, phone, website_url, notes')
    .eq('country', countryName)
    .eq('is_active', true);

  // Some rinks are tagged with the FULL state/province name (e.g. 'Alabama')
  // rather than the abbreviation ('AL'). Defensive OR clause recovers both.
  // Verified 2026-07-07: 18 rinks across 9 states use full-name tagging.
  const applyRegionTag = (q: typeof rinksQuery) => {
    if (!regionAbbr && !regionName) return q;
    const orClause = `province_state.eq.${regionAbbr || regionName},province_state.eq.${regionName || regionAbbr}`;
    return q.or(orClause);
  };
  if (countrySlug === 'united-states' || countrySlug === 'usa') {
    teamsQuery = teamsQuery.or(`city.ilike.${cityName}`);
    rinksQuery = applyRegionTag(rinksQuery)
      .or(`city.ilike.${cityName},address.ilike.%${cityName}%`);
  } else if (countrySlug === 'canada') {
    // Teams table has no province_state column; use exact city match (filtered by country)
    teamsQuery = teamsQuery.eq('city', cityName);
    rinksQuery = applyRegionTag(rinksQuery).eq('city', cityName);
  } else if (countrySlug === 'united-kingdom' || countrySlug === 'uk') {
    teamsQuery = teamsQuery.ilike('city', `%${cityName}%`);
    rinksQuery = rinksQuery.ilike('city', `%${cityName}%`);
  }

  teamsQuery = teamsQuery.order('name');
  rinksQuery = rinksQuery.order('name');

  const [{ data: teamsData }, { data: rinksData }, { data: programsData }] = await Promise.all([
    teamsQuery,
    rinksQuery,
    // Programs use country + city exact match (same query shape as the
    // prior /directory/locations/[country]/[city]/CityPageClient before
    // Tier 1c enrichment). Ilike patterns aren't needed because the
    // youth_programs table has clean city values.
    supabase
      .from('youth_programs')
      .select('id')
      .eq('country', countryName)
      .eq('city', cityName)
      .eq('is_active', true),
  ]);

  // PR4 (2026-07-08): peer cities in the same region. We over-fetch rinks
  // + teams in this region (excluding current city), then aggregate by
  // city in JS. Region filter only applied when state/province context
  // is available; international city pages (no region) skip the section.
  let peerCities: CityPageData['peerCities'] = [];
  if (regionAbbr || regionName) {
    const peerRegionOr = `province_state.eq.${regionAbbr || regionName},province_state.eq.${regionName || regionAbbr}`;
    const [peerRinksRes, peerTeamsRes] = await Promise.all([
      supabase
        .from('rinks')
        .select('city')
        .eq('country', countryName)
        .or(peerRegionOr)
        .neq('city', cityName)
        .not('city', 'is', null)
        .eq('is_active', true)
        .limit(500),
      supabase
        .from('teams')
        .select('city')
        .eq('country', countryName)
        .or(peerRegionOr)
        .neq('city', cityName)
        .not('city', 'is', null)
        .eq('is_active', true)
        .limit(500),
    ]);
    const counts = new Map<string, { teamCount: number; rinkCount: number }>();
    for (const r of peerRinksRes.data || []) {
      if (!r.city) continue;
      const entry = counts.get(r.city) || { teamCount: 0, rinkCount: 0 };
      entry.rinkCount += 1;
      counts.set(r.city, entry);
    }
    for (const t of peerTeamsRes.data || []) {
      if (!t.city) continue;
      const entry = counts.get(t.city) || { teamCount: 0, rinkCount: 0 };
      entry.teamCount += 1;
      counts.set(t.city, entry);
    }
    peerCities = Array.from(counts.entries())
      .map(([name, c]) => {
        const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        return {
          name,
          slug,
          teamCount: c.teamCount,
          rinkCount: c.rinkCount,
          href: `/directory/${countrySlug}/${regionSlug}/${slug}`,
        };
      })
      .sort((a, b) => (b.teamCount + b.rinkCount) - (a.teamCount + a.rinkCount))
      .slice(0, 12);
  }
  const programCount = (programsData || []).length;

  // Dedupe rinks by id (in case both city and address match returned same row)
  const seenRinkIds = new Set<string>();
  const rinks = (rinksData || []).filter(r => {
    if (seenRinkIds.has(r.id)) return false;
    seenRinkIds.add(r.id);
    return true;
  });

  const teams = teamsData || [];

  // Compute leagues in this city from team data (Phase 1 step 2 - unique content)
  // Aggregate by league_id, then look up league names + slugs
  const leagueIdCounts: Record<string, number> = {};
  for (const t of teams) {
    if (t.league_id) {
      leagueIdCounts[t.league_id] = (leagueIdCounts[t.league_id] || 0) + 1;
    }
  }
  const leagueIds = Object.keys(leagueIdCounts);

  // Fetch league names + slugs for the unique league IDs
  let leaguesInCity: { name: string; count: number; slug: string }[] = [];
  if (leagueIds.length > 0) {
    const { data: leaguesData } = await supabase
      .from('leagues')
      .select('id, name, slug')
      .in('id', leagueIds);
    if (leaguesData) {
      leaguesInCity = leaguesData
        .map(l => ({
          name: l.name,
          count: leagueIdCounts[l.id] || 0,
          slug: l.slug,
        }))
        .sort((a, b) => b.count - a.count); // Largest first
    }
  }

  const locationDesc = regionName
    ? `${cityName}, ${regionName}, ${countryName}`
    : `${cityName}, ${countryName}`;

  return {
    countryName,
    countrySlug,
    regionName,
    regionSlug,
    regionAbbr,
    cityName,
    citySlug,
    teams,
    rinks,
    teamCount: teams.length,
    rinkCount: rinks.length,
    programCount,
    leaguesInCity,
    proTeams,
    peerCities,
    breadcrumb,
    title: `${locationDesc} Hockey - Teams, Rinks & Leagues | RinkStop`,
    description: `Find hockey teams, ice rinks, and leagues in ${locationDesc}. Discover youth programs, adult leagues, and professional hockey near you.`,
    canonicalPath: regionSlug
      ? `/directory/${countrySlug}/${regionSlug}/${citySlug}`
      : `/directory/${countrySlug}/${citySlug}`,
  };
}
