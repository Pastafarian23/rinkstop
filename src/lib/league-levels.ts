/**
 * League → level classification for the teams directory filter.
 *
 * Source-of-truth mapping for the 33 leagues that actually have teams in our DB.
 * If a new league gets imported with teams, add it here (and decide its level).
 *
 * Levels:
 *   pro          — top-tier professional hockey (NHL, KHL, top European leagues, PWHL)
 *   junior       — major junior / draft-eligible leagues (CHL, USHL)
 *   college      — university-level (NCAA, U Sports)
 *   international — national-team programs and IIHF tournaments
 *   adult        — senior amateur / recreational / regional leagues (the long tail)
 *
 * Why not auto-classify via name patterns: a single misspelling or new league
 * name can break a regex rule. Manual mapping is auditable and one-line.
 *
 * Why duplicate keys: "WHL" and "Western Hockey League" are the same league
 * imported twice with different country strings. Same for "Asia League Ice Hockey".
 * Mapping both keeps the filter correct regardless of which row the join picks.
 */

export type Level = 'pro' | 'junior' | 'college' | 'international' | 'adult';

export const LEVEL_LABELS: Record<Level, string> = {
  pro: 'Pro',
  junior: 'Junior',
  college: 'College',
  international: 'International',
  adult: 'Adult',
};

export const LEVEL_ORDER: Level[] = ['pro', 'junior', 'college', 'international', 'adult'];

export const LEAGUE_LEVELS: Record<string, Level> = {
  // Pro
  'National Hockey League': 'pro',
  'American Hockey League': 'pro',
  'Kontinental Hockey League': 'pro',
  'Finnish Liiga': 'pro',
  'Liiga': 'pro',                         // alternate name
  'DEL': 'pro',
  'Swedish Hockey League': 'pro',
  'SHL': 'pro',                           // alternate name
  'Professional Women\u2019s Hockey League': 'pro',
  'PWHL Women': 'pro',                    // alternate name
  'ECHL': 'pro',
  'Asia League Ice Hockey': 'pro',        // pro Asian league (Japan/Korea/China)

  // Junior
  'Ontario Hockey League': 'junior',
  'Western Hockey League': 'junior',
  'WHL': 'junior',                        // abbreviation for Western Hockey League
  'Quebec Major Junior Hockey League': 'junior',
  'United States Hockey League': 'junior',

  // College
  'NCAA Division 1 Men\u2019s Hockey': 'college',
  'U SPORTS': 'college',

  // International
  'IIHF World Championships': 'international',
  'Friendly International': 'international',

  // Adult (the long tail — these are regional / amateur / recreational leagues)
  'Elite League': 'adult',                // UK
  'Icelandic Men\u2019s Hockey League': 'adult',
  'Israel Elite Hockey League': 'adult',
  'Emirates Ice Hockey League': 'adult',
  'Georgian Ice Hockey League': 'adult',
  'Croatian Ice Hockey League': 'adult',
  'Prvenstvo Srbije (Serbian League)': 'adult',
  'Hong Kong Amateur Hockey League': 'adult',
  'HKCIHA Club League': 'adult',
  'Indonesian Ice Hockey League': 'adult',
  'Athens Ice Hockey League': 'adult',
  'Bangkok Ice Hockey League': 'adult',
  'Siam Hockey League': 'adult',
  'Philippine Hockey League': 'adult',
  'Campeonato Brasileiro de Hockey no Gelo': 'adult',
  'Campeonato Nacional de H\u00f3quei no Gelo': 'adult',
};

/**
 * Look up level for a given league name.
 * Falls back to 'adult' if the league isn't in the map — better to show
 * the team under a default bucket than to drop it from results entirely.
 */
export function levelForLeague(leagueName: string | null | undefined): Level {
  if (!leagueName) return 'adult';
  return LEAGUE_LEVELS[leagueName] ?? 'adult';
}

/**
 * Look up level for a user-created team workspace.
 * Reads from age_category: youth → youth_bucket, adult → adult, anything else → adult.
 */
export function levelForUserTeam(ageCategory: string | null | undefined, levelField: string | null | undefined): Level {
  if (levelField && (['pro','junior','college','international','adult'] as Level[]).includes(levelField as Level)) {
    return levelField as Level;
  }
  // No explicit level on user teams → bucket by age_category
  // (team_workspaces.age_category is the structured youth/adult signal)
  // For the directory filter, user teams without a level land in 'adult' by default;
  // we'll surface them properly once the team owner fills in the level field.
  return ageCategory === 'youth' ? 'adult' : 'adult'; // both currently → 'adult' for the filter
}
