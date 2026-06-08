// Chip configuration for the Scores & Fixtures page.
// Each chip maps to one or more league slugs that exist in the `leagues` table.
// Update this when new leagues get fixture data synced.

export type ChipType = 'league' | 'category';

export interface ScoreChip {
  slug: string;            // URL value, e.g. ?league=nhl
  label: string;           // Display label on the chip
  type: ChipType;          // 'league' = shows team dropdown; 'category' = shows sub-league dropdown
  leagueSlugs: string[];   // Slugs of leagues that belong to this chip (in `leagues.slug`)
}

// Order matters — this is the display order of chips left-to-right.
export const SCORE_CHIPS: ScoreChip[] = [
  { slug: 'nhl',     label: 'NHL',     type: 'league',   leagueSlugs: ['nhl'] },
  { slug: 'ahl',     label: 'AHL',     type: 'league',   leagueSlugs: ['ahl'] },
  { slug: 'pwhl',    label: 'PWHL',    type: 'league',   leagueSlugs: ['pwhl'] },
  { slug: 'intl',    label: 'Intl',    type: 'category', leagueSlugs: ['khl'] },
  { slug: 'college', label: 'NCAA',    type: 'category', leagueSlugs: ['ncaa-division-1-hockey'] },
  { slug: 'junior',  label: 'Junior',  type: 'category', leagueSlugs: ['whl', 'ohl', 'qmjhl'] },
];

export const DEFAULT_CHIP = 'nhl';
export const DEFAULT_TIME = 'current';
export const DEFAULT_PAGE_SIZE = 50;

// Time filter: 'current' = recent/upcoming/live; 'historical' = older than RECENT_CUTOFF_DAYS AND completed
export const RECENT_CUTOFF_DAYS = 3;

export function getRecentCutoff(now: Date = new Date()): Date {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() - RECENT_CUTOFF_DAYS);
  return d;
}

export function getChip(slug: string | null | undefined): ScoreChip {
  return SCORE_CHIPS.find(c => c.slug === slug) || SCORE_CHIPS[0];
}
