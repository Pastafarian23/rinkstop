/**
 * src/lib/passport/17-challenge-tailoring.ts
 *
 * Tailor Hockey Passport challenges to the user.
 *
 * Per Arnel directive 2026-09-30 (memory/2026-09-30-passport-monetization.md):
 *   - Challenges MUST be tailored by account_type AND location.
 *   - A Philippines player should NOT see "NHL Rink Circuit" unless they
 *     explicitly opted in to track NHL.
 *   - A USA coach should NOT see "Philippines rinks" challenges unless they
 *     explicitly opted in to track PH.
 *   - College players see college-level challenges. Adult rec players see
 *     adult rec challenges. Coaches see coach-specific challenges.
 *   - Default-on scope = home country + same-region peers.
 *   - Opt-in scope = passport_challenge_prefs table.
 *
 * What this module does:
 *   1. Resolve user's challenge tier (youth/college/adult_rec/pro/coach/
 *      scout/official/fan/org) from account_type + claimed player context.
 *   2. Resolve user's default-on geographic scope (home country + region group).
 *   3. Compute the final list of challenges (default-on + opt-in).
 *   4. Provide challenge-def builders for each category (league, geographic,
 *      career) that respect the computed scope.
 *
 * Pure functions + types. No DB calls. The caller (ChallengesSection) fetches
 * the user's profile + prefs once, passes them in, and uses the returned
 * scope to filter challenge definitions.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** Account-type → challenge-tier mapping. */
export type ChallengeTier =
  | 'youth'           // youth/junior player
  | 'college'         // college player (NCAA/USports)
  | 'adult_rec'       // adult rec league player
  | 'pro'             // pro / NHL / KHL / SHL / DEL / Liiga player
  | 'coach'           // coach (NOT rink circuits)
  | 'scout'           // scout (NOT rink circuits)
  | 'official'        // referee / official
  | 'parent'          // parent (inherits kid's challenges)
  | 'fan'             // fan (rinks visited only)
  | 'org';            // team/league/rink/business (org challenges)

/** Region group — used to derive default-on geographic scope. */
export type RegionGroup =
  | 'philippines_sea'  // PH + SEA neighbors
  | 'north_america'    // USA + Canada
  | 'nordics'          // Sweden + Finland + Norway + Denmark
  | 'dach'             // Germany + Austria + Switzerland
  | 'czech_slovakia'   // CZ + SK
  | 'uk_ireland'       // UK + Ireland + nearby European
  | 'japan'            // Japan + Asia League
  | 'global';          // fallback when country not in any group

/** Per-user scope for challenges. Resolved by resolveScope(). */
export interface ChallengeScope {
  tier: ChallengeTier;
  homeCountry: string | null;        // ISO-2 if known (e.g. 'PH', 'US')
  region: RegionGroup;
  /** Default-on country codes for geographic challenges (always includes home). */
  defaultCountries: string[];
  /** Default-on league slugs for league-circuit challenges. */
  defaultLeagues: string[];
  /** Opt-in additions from passport_challenge_prefs. */
  optInCountries: string[];
  optInLeagues: string[];
  /** Final computed lists (union of default + opt-in). */
  activeCountries: string[];
  activeLeagues: string[];
}

/** Opt-in preferences row from passport_challenge_prefs. */
export interface ChallengePrefsRow {
  opted_in_leagues: string[];
  opted_in_countries: string[];
}

/** User's account_type (from profiles.account_type or profile_account_types). */
export interface UserProfileSummary {
  accountType: string | null;
  country: string | null;       // ISO-2 if available
  location: string | null;      // free-text city/state
  /** Whether the user has claimed a player profile (drives college/pro tier). */
  hasClaimedPlayer: boolean;
  /** Whether the user manages any kid profiles (Family Hub). */
  isParent: boolean;
  /** Optional: the league level of the claimed player, if known. */
  playerLeagueLevel?: 'youth' | 'junior' | 'college' | 'adult_rec' | 'pro' | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Account-type → tier mapping
// ─────────────────────────────────────────────────────────────────────────────

const ACCOUNT_TYPE_TO_TIER: Record<string, ChallengeTier> = {
  player: 'youth',          // default; upgraded below if claimed player has context
  coach: 'coach',
  scout: 'scout',
  referee: 'official',
  parent: 'parent',
  fan: 'fan',
  team: 'org',
  league: 'org',
  rink: 'org',
  business: 'org',
};

/**
 * Resolve the user's challenge tier from account_type + claimed player context.
 *
 * Claimed player tier overrides the default 'youth' based on league level:
 *   - 'college' → 'college'
 *   - 'adult_rec' → 'adult_rec'
 *   - 'pro' → 'pro'
 */
export function resolveTier(user: UserProfileSummary): ChallengeTier {
  if (user.isParent) return 'parent';

  const base = ACCOUNT_TYPE_TO_TIER[user.accountType ?? 'fan'] ?? 'fan';

  // Only 'player' is upgradable based on claimed-player context.
  if (base === 'youth' && user.hasClaimedPlayer) {
    if (user.playerLeagueLevel === 'college') return 'college';
    if (user.playerLeagueLevel === 'adult_rec') return 'adult_rec';
    if (user.playerLeagueLevel === 'pro') return 'pro';
    // youth/junior leave base as 'youth'
  }

  return base;
}

// ─────────────────────────────────────────────────────────────────────────────
// Region group → default-on countries + leagues
// ─────────────────────────────────────────────────────────────────────────────

const COUNTRY_TO_REGION: Record<string, RegionGroup> = {
  // Philippines + SEA neighbors
  PH: 'philippines_sea',
  MY: 'philippines_sea',
  TH: 'philippines_sea',
  SG: 'philippines_sea',
  ID: 'philippines_sea',
  VN: 'philippines_sea',
  TW: 'philippines_sea',
  // North America (USA Hockey / Hockey Canada share competition)
  US: 'north_america',
  CA: 'north_america',
  // Nordics
  SE: 'nordics',
  FI: 'nordics',
  NO: 'nordics',
  DK: 'nordics',
  // DACH
  DE: 'dach',
  AT: 'dach',
  CH: 'dach',
  // CZ/SK
  CZ: 'czech_slovakia',
  SK: 'czech_slovakia',
  // UK/Ireland
  GB: 'uk_ireland',
  IE: 'uk_ireland',
  // Japan
  JP: 'japan',
};

const REGION_TO_DEFAULT_COUNTRIES: Record<RegionGroup, string[]> = {
  philippines_sea: ['PH', 'MY', 'TH', 'SG', 'ID', 'VN', 'TW', 'JP'],
  north_america: ['US', 'CA'],
  nordics: ['SE', 'FI', 'NO', 'DK'],
  dach: ['DE', 'AT', 'CH'],
  czech_slovakia: ['CZ', 'SK'],
  uk_ireland: ['GB', 'IE'],
  japan: ['JP'],
  global: [],
};

const REGION_TO_DEFAULT_LEAGUES: Record<RegionGroup, string[]> = {
  philippines_sea: ['phlihl', 'asean-hockey'],
  north_america: ['nhl', 'ahl', 'echl', 'ohl', 'whl', 'qmjhl', 'ushl', 'ncaa'],
  nordics: ['shl', 'liiga', 'hockeyallsvenskan', 'mestis'],
  dach: ['del', 'del2', 'nl', 'swiss-nl'],
  czech_slovakia: ['extraliga', 'extraliga-cz'],
  uk_ireland: ['eihl'],
  japan: ['asia-league', 'japan-domestic'],
  global: [],
};

/**
 * Default-on leagues by tier (in addition to region defaults).
 * College → NCAA. Adult rec → adult-rec. Pro → NHL/KHL/SHL/DEL/Liiga.
 */
const TIER_TO_EXTRA_LEAGUES: Record<ChallengeTier, string[]> = {
  youth: [],
  college: ['ncaa', 'ushl', 'nahl'],
  adult_rec: ['adult-rec'],
  pro: ['nhl', 'khl', 'shl', 'del', 'liiga'],
  coach: [],          // coaches don't do rink circuits by default
  scout: [],
  official: [],
  parent: [],
  fan: [],
  org: [],
};

/** Career milestone thresholds per tier. */
export const CAREER_MILESTONES_BY_TIER: Record<ChallengeTier, number[]> = {
  youth: [5, 10, 25, 50, 100],
  college: [10, 25, 50, 100, 250],
  adult_rec: [3, 5, 10, 25, 50],
  pro: [50, 100, 250, 500, 1000],
  coach: [10, 25, 50, 100],         // seasons coached
  scout: [25, 50, 100, 250],        // prospects reviewed
  official: [10, 25, 50, 100, 250], // games officiated
  parent: [5, 10, 25, 50],          // per kid
  fan: [3, 5, 10, 25],
  org: [5, 10, 25, 50],
};

/** Whether the tier should see rink-circuit challenges at all. */
export function tierShowsRinkCircuits(tier: ChallengeTier): boolean {
  return ['youth', 'college', 'adult_rec', 'pro', 'fan'].includes(tier);
}

/** Whether the tier should see geographic challenges. */
export function tierShowsGeographicChallenges(tier: ChallengeTier): boolean {
  return ['youth', 'college', 'adult_rec', 'pro', 'coach', 'official', 'fan'].includes(tier);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main: resolveScope
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute the user's challenge scope.
 *
 * Inputs:
 *   - user: profile summary (account_type, location, claimed-player context)
 *   - prefs: opt-in row from passport_challenge_prefs (may be null)
 *
 * Output: ChallengeScope with the final active countries + leagues.
 */
export function resolveScope(
  user: UserProfileSummary,
  prefs: ChallengePrefsRow | null
): ChallengeScope {
  const tier = resolveTier(user);
  const homeCountry = (user.country ?? '').toUpperCase() || null;
  const region: RegionGroup = (homeCountry && COUNTRY_TO_REGION[homeCountry]) || 'global';

  // Default-on countries: region group ∪ home country
  const defaultCountries = Array.from(
    new Set([...(REGION_TO_DEFAULT_COUNTRIES[region] ?? []), ...(homeCountry ? [homeCountry] : [])])
  );

  // Default-on leagues: region ∪ tier extras
  const defaultLeagues = Array.from(
    new Set([
      ...(REGION_TO_DEFAULT_LEAGUES[region] ?? []),
      ...(TIER_TO_EXTRA_LEAGUES[tier] ?? []),
    ])
  );

  // Opt-in additions from prefs
  const optInCountries = prefs?.opted_in_countries ?? [];
  const optInLeagues = prefs?.opted_in_leagues ?? [];

  // Active = default ∪ opt-in
  const activeCountries = Array.from(new Set([...defaultCountries, ...optInCountries]));
  const activeLeagues = Array.from(new Set([...defaultLeagues, ...optInLeagues]));

  return {
    tier,
    homeCountry,
    region,
    defaultCountries,
    defaultLeagues,
    optInCountries,
    optInLeagues,
    activeCountries,
    activeLeagues,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Filtering helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Filter a league-circuit challenge so it only shows if its league is in
 * the user's active scope.
 */
export function isLeagueInScope(
  leagueSlug: string | null | undefined,
  scope: ChallengeScope
): boolean {
  if (!leagueSlug) return false;
  return scope.activeLeagues.includes(leagueSlug.toLowerCase());
}

/**
 * Filter a geographic challenge so it only shows if its country is in
 * the user's active scope.
 */
export function isCountryInScope(
  countryCode: string | null | undefined,
  scope: ChallengeScope
): boolean {
  if (!countryCode) return false;
  return scope.activeCountries.includes(countryCode.toUpperCase());
}

/**
 * Country → ISO-2 lookup. The rinks table stores full names (e.g. 'United
 * States', 'Philippines') not ISO codes. This map normalizes the common
 * countries we expect to challenge on.
 */
const COUNTRY_NAME_TO_ISO: Record<string, string> = {
  'united states': 'US',
  'usa': 'US',
  'canada': 'CA',
  'philippines': 'PH',
  'malaysia': 'MY',
  'thailand': 'TH',
  'singapore': 'SG',
  'indonesia': 'ID',
  'vietnam': 'VN',
  'taiwan': 'TW',
  'japan': 'JP',
  'sweden': 'SE',
  'finland': 'FI',
  'norway': 'NO',
  'denmark': 'DK',
  'germany': 'DE',
  'austria': 'AT',
  'switzerland': 'CH',
  'czech republic': 'CZ',
  'czechia': 'CZ',
  'slovakia': 'SK',
  'united kingdom': 'GB',
  'uk': 'GB',
  'ireland': 'IE',
  'russia': 'RU',
  'kazakhstan': 'KZ',
  'china': 'CN',
  'south korea': 'KR',
  'korea': 'KR',
};

export function countryNameToIso(name: string | null | undefined): string | null {
  if (!name) return null;
  return COUNTRY_NAME_TO_ISO[name.trim().toLowerCase()] ?? null;
}

/**
 * League name → slug. Normalizes common league names to our directory slugs.
 * Extends as needed; missing mappings return null and the league is excluded.
 */
const LEAGUE_NAME_TO_SLUG: Record<string, string> = {
  'nhl': 'nhl',
  'national hockey league': 'nhl',
  'ahl': 'ahl',
  'american hockey league': 'ahl',
  'echl': 'echl',
  'ohl': 'ohl',
  'ontario hockey league': 'ohl',
  'whl': 'whl',
  'western hockey league': 'whl',
  'qmjhl': 'qmjhl',
  'ushl': 'ushl',
  'united states hockey league': 'ushl',
  'ncaa': 'ncaa',
  'ncaa men': 'ncaa',
  'ncaa women': 'ncaa',
  'shl': 'shl',
  'swedish hockey league': 'shl',
  'liiga': 'liiga',
  'hockeyallsvenskan': 'hockeyallsvenskan',
  'mestis': 'mestis',
  'del': 'del',
  'deutsche eishockey liga': 'del',
  'del2': 'del2',
  'nl': 'nl',
  'swiss nl': 'nl',
  'swiss national league': 'nl',
  'national league': 'nl',
  'extraliga': 'extraliga',
  'czech extraliga': 'extraliga',
  'eihl': 'eihl',
  'elite ice hockey league': 'eihl',
  'khl': 'khl',
  'kontinental hockey league': 'khl',
  'phl': 'phlihl',
  'philippine hockey league': 'phlihl',
  'phlihl': 'phlihl',
  'asia league': 'asia-league',
  'asean hockey': 'asean-hockey',
};

export function leagueNameToSlug(name: string | null | undefined): string | null {
  if (!name) return null;
  return LEAGUE_NAME_TO_SLUG[name.trim().toLowerCase()] ?? null;
}