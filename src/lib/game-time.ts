/**
 * src/lib/game-time.ts
 *
 * Centralized game-time formatting + timezone-disclaimer helpers.
 *
 * Why this exists (2026-09-14, Arnel-flagged):
 *   "make sure there is also a disclaimer of the time displayed being in the
 *    specified time zone. This will be important when we have games listed
 *    from global hockey games."
 *
 * Three things this module guarantees for every game surface:
 *
 *   1. Times render with an explicit timezone abbreviation
 *      (e.g. "Sat, Sep 19 · 7:00 PM ET", "20:00 CET", "10:00 UTC").
 *      No silent local-tz rendering. No browser-locale ambiguity.
 *
 *   2. Every listing surface that shows game times includes a
 *      `<GameTimezoneDisclaimer />` rendered as a small subtle line
 *      near the time column. Honest disclosure is more valuable than
 *      a flashier UX.
 *
 *   3. Future leagues (KHL, SHL, Liiga, DEL, etc.) plug in once,
 *      uniformly — no per-page formatting drift as we add leagues.
 */

import { timezoneForCountry } from './team-timezone';

/**
 * Map league slug → display timezone for that competition.
 * Default to America/New_York for NHL, America/Toronto for CHL/CAN leagues,
 * UTC for everything else.
 */
export const LEAGUE_TIMEZONE: Record<string, string> = {
  nhl: 'America/New_York',
  ahl: 'America/New_York',
  ecbl: 'America/New_York',
  echl: 'America/New_York',
  iihf: 'Europe/Zurich',
  olym: 'Europe/Zurich',
  world_championships: 'Europe/Zurich',
  khl: 'Europe/Moscow',
  shl: 'Europe/Stockholm',          // Sweden
  hockeyallsvenskan: 'Europe/Stockholm',
  liiga: 'Europe/Helsinki',         // Finland
  mestis: 'Europe/Helsinki',
  del: 'Europe/Berlin',             // Germany
  del2: 'Europe/Berlin',
  national_league: 'Europe/Zurich', // Swiss NL
  extraliga: 'Europe/Prague',       // Czech
  chl: 'America/Toronto',
  whl: 'America/Edmonton',
  ohl: 'America/Toronto',
  qmjhl: 'America/Toronto',
  ushl: 'America/Chicago',
  nahl: 'America/Chicago',
  pwhl: 'America/New_York',
  collegiate: 'America/New_York',
  cw_hockey: 'America/Toronto',
  hockey_east: 'America/New_York',
  ecac: 'America/New_York',
  big_ten: 'America/New_York',
  nchc: 'America/Chicago',
  atlantic: 'America/New_York',
  wcha: 'America/Chicago',
  southern: 'America/New_York',
  long: 'America/New_York',
  ice_time_marketplace: 'UTC',
  public_booking_inquiries: 'UTC',
  NCAA: 'America/New_York',
  EPL: 'Europe/London',
};

/**
 * Lightweight abbreviation mapping for the most common IANA zones.
 * The browser's `Intl.DateTimeFormat` does NOT produce a 2-5 letter
 * abbreviation (`timeZoneName: 'short'` returns e.g. "GMT-5" not "EST").
 * We maintain a small manual map to surface the friendly abbreviation
 * readers expect.
 */
export const TZ_ABBR: Record<string, string> = {
  'America/New_York': 'ET',
  'America/Toronto': 'ET',
  'America/Chicago': 'CT',
  'America/Edmonton': 'MT',
  'America/Denver': 'MT',
  'America/Los_Angeles': 'PT',
  'America/Vancouver': 'PT',
  'Europe/London': 'GMT',
  'Europe/Paris': 'CET',
  'Europe/Berlin': 'CET',
  'Europe/Madrid': 'CET',
  'Europe/Rome': 'CET',
  'Europe/Amsterdam': 'CET',
  'Europe/Stockholm': 'CET',
  'Europe/Helsinki': 'EET',
  'Europe/Zurich': 'CET',
  'Europe/Vienna': 'CET',
  'Europe/Prague': 'CET',
  'Europe/Budapest': 'CET',
  'Europe/Warsaw': 'CET',
  'Europe/Moscow': 'MSK',
  'Europe/Istanbul': 'TRT',
  'Europe/Helsinki,EET': 'EET',
  UTC: 'UTC',
};

export function tzAbbr(ianaTz: string): string {
  return TZ_ABBR[ianaTz] ?? ianaTz;
}

/**
 * Resolve the timezone for a (league_slug, country_code) pair.
 * League-specific overrides win; fall back to country => IANA mapping;
 * fall back to UTC.
 */
export function timezoneForGame(opts: {
  leagueSlug?: string | null;
  countryCode?: string | null;
}): string {
  const leagueKey = (opts.leagueSlug ?? '').toLowerCase();
  if (LEAGUE_TIMEZONE[leagueKey]) return LEAGUE_TIMEZONE[leagueKey];
  return timezoneForCountry(opts.countryCode) ?? 'UTC';
}

/**
 * Format a game time (ISO 8601 datetime string) for the given timezone.
 *
 * Output shape: "Sat, Sep 19 · 7:00 PM ET"
 *              "Sun, Sep 20 · 2:00 PM ET"
 *              "Thu, Sep 24 · 7:00 PM ET"  (with optional date if the year differs)
 */
export function formatGameTime(iso: string, timezone: string): string {
  const dt = new Date(iso);
  if (isNaN(dt.getTime())) return '—';
  const datePart = dt.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    timeZone: timezone,
  });
  const timePart = dt.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit',
    hour12: true,
    timeZone: timezone,
  });
  return `${datePart} · ${timePart} ${tzAbbr(timezone)}`;
}

/**
 * Format just the time portion (no date, no weekday).
 * Useful for schedule tables that have a separate date column.
 */
export function formatGameHour(iso: string, timezone: string): string {
  const dt = new Date(iso);
  if (isNaN(dt.getTime())) return '—';
  const timePart = dt.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit',
    hour12: true,
    timeZone: timezone,
  });
  return `${timePart} ${tzAbbr(timezone)}`;
}

/**
 * Format just the date portion (no time).
 * Useful for schedule headers.
 */
export function formatGameDate(iso: string, timezone: string = 'UTC'): string {
  const dt = new Date(iso);
  if (isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    timeZone: timezone,
  });
}

/**
 * Long form for hero headers / FAQs.
 */
export function formatGameDateLong(iso: string, timezone: string = 'UTC'): string {
  const dt = new Date(iso);
  if (isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    timeZone: timezone,
  });
}

/**
 * Disclaimer component for inline placement.
 * Add it under the time column / next to the schedule table.
 *
 * <p>Times shown in ET (Eastern Time). All NHL games use Eastern Time unless noted.</p>
 *
 * Variant selection:
 *   - compact: single-line (good for narrow card widgets)
 *   - standard: single-line, slightly more verbose (good for hero/large surfaces)
 *   - by_league: takes a list of leagues + their timezones (for hub pages)
 */
export const TZ_DISCLAIMER_PREFIX =
  'All times shown in ';

export function disclaimerText(
  timezone: string = 'America/New_York',
  scope: 'compact' | 'standard' = 'standard',
): string {
  const abbr = tzAbbr(timezone);
  if (scope === 'compact') return `${abbr} · check local arena time`;
  return `All times shown in ${timezone.replace(/_/g, ' ')} (${abbr}). Game times are local to the venue; verify with your team before traveling.`;
}

/**
 * Per-league breakdown for hub pages (mix of leagues).
 *
 * Example output for NHL/AHL/PWHL/NCAA hub:
 *   "NHL & AHL — ET  •  CWHL — ET  •  SHL (Sweden) — CET  •  Liiga (Finland) — EET"
 */
export function multiLeagueDisclaimer(
  leagues: { name: string; ianaTz: string }[],
): string {
  return leagues
    .map(l => `${l.name} — ${tzAbbr(l.ianaTz)}`)
    .join('  •  ');
}

/**
 * Resolve the human label for a timezone abbreviation (e.g. "ET")
 * to the full IANA name so we can be transparent when games span
 * multiple timezones.
 */
export const TZ_FULL_NAME: Record<string, string> = {
  ET: 'Eastern Time (New York/Toronto)',
  CT: 'Central Time (Chicago)',
  MT: 'Mountain Time (Denver/Edmonton)',
  PT: 'Pacific Time (Los Angeles/Vancouver)',
  CET: 'Central European Time',
  EET: 'Eastern European Time',
  GMT: 'Greenwich Mean Time',
  MSK: 'Moscow Standard Time',
  UTC: 'Coordinated Universal Time',
};

export function tzFullName(abbr: string): string {
  return TZ_FULL_NAME[abbr] ?? abbr;
}
