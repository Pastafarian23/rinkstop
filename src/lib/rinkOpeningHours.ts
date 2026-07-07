// src/lib/rinkOpeningHours.ts
//
// Compute the current "Open / Closed" state for a rink from its
// opening_hours_json (the verbatim Google Places object).
//
// Google's opening_hours structure (simplified):
//   {
//     open_now: boolean,           // Google's own answer for "right now"
//     periods: [
//       { open:  { day: 0-6, time: "HHMM" },
//         close: { day: 0-6, time: "HHMM" } },
//       ...
//     ],
//     weekday_text: ["Monday: 9:00 AM – 11:00 PM", ...]
//   }
//
// day: 0 = Sunday, 1 = Monday, ..., 6 = Saturday (Google's convention).
// time: "HHMM" 24-hour, e.g. "0900" = 9:00 AM, "2330" = 11:30 PM.
//
// We compute the state at request time (server-side) so the pill is
// always accurate when the page renders, without any client JS.

export type OpeningHoursJson = {
  open_now?: boolean;
  periods?: Array<{
    open: { day: number; time: string };
    close: { day: number; time: string };
  }>;
  weekday_text?: string[];
};

export type RinkOpenState =
  | { kind: 'open'; closesAt: string; closesAtLabel: string }
  | { kind: 'closed'; nextOpen: string; nextOpenLabel: string }
  | { kind: 'unknown' };

const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

function parseHHMM(s: string): { hours: number; minutes: number } {
  // Google returns "HHMM" zero-padded (e.g. "0900", "2330"). Defensive
  // parse in case they ever return "9:00" or similar.
  const cleaned = s.replace(':', '').padStart(4, '0');
  const hours = Number.parseInt(cleaned.slice(0, 2), 10);
  const minutes = Number.parseInt(cleaned.slice(2, 4), 10);
  return { hours: Number.isFinite(hours) ? hours : 0, minutes: Number.isFinite(minutes) ? minutes : 0 };
}

function formatTime12h(s: string): string {
  const { hours, minutes } = parseHHMM(s);
  const period = hours >= 12 ? 'pm' : 'am';
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return minutes === 0 ? `${h12}${period}` : `${h12}:${String(minutes).padStart(2, '0')}${period}`;
}

/**
 * Build a flat sorted list of "next 7 days of opening times" from the
 * periods array. Each entry is the absolute minute-of-week (0..10079)
 * for the period's open, paired with the original period object.
 *
 * Periods that span past midnight (close.day > open.day) are kept as-is
 * because we only need the open side to find the next opening.
 */
type NextOpening = { openAbs: number; period: OpeningHoursJson['periods'][number] };

function buildNextOpenings(periods: NonNullable<OpeningHoursJson['periods']>): NextOpening[] {
  const out: NextOpening[] = periods
    .map((p) => {
      const openMin = parseHHMM(p.open.time).hours * 60 + parseHHMM(p.open.time).minutes;
      return { openAbs: p.open.day * 24 * 60 + openMin, period: p };
    })
    .sort((a, b) => a.openAbs - b.openAbs);
  return out;
}

/**
 * Compute the current open/closed state for a rink at a given "now".
 * Used server-side at request time so the pill is always fresh.
 *
 * Returns:
 *   { kind: 'open',   closesAt, closesAtLabel }    — rink is open right now
 *   { kind: 'closed', nextOpen, nextOpenLabel }    — rink is closed, here's when it next opens
 *   { kind: 'unknown' }                            — no periods data to compute from
 */
export function computeOpenState(oh: OpeningHoursJson | null | undefined, now: Date = new Date()): RinkOpenState {
  if (!oh || !Array.isArray(oh.periods) || oh.periods.length === 0) {
    return { kind: 'unknown' };
  }

  // Google day: 0=Sun, 1=Mon, ..., 6=Sat. JS getDay() uses the same convention.
  const nowDay = now.getDay();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowAbs = nowDay * 24 * 60 + nowMinutes;

  // 1) Check if we're inside a period right now.
  for (const p of oh.periods) {
    // Tier 1h (2026-07-07): defensive. Some rinks have malformed periods
    // (e.g., {open: {day, time}} with no close key, or vice versa). We were
    // crashing on `p.close.day` for 4 specific rinks, causing 500s on their
    // pages. Skip malformed periods silently; the rink still renders fine.
    if (!p || !p.open || typeof p.open.day !== 'number' || typeof p.open.time !== 'string') continue;
    if (!p.close || typeof p.close.day !== 'number' || typeof p.close.time !== 'string') continue;
    const openMin = p.open.day * 24 * 60 + parseHHMM(p.open.time).hours * 60 + parseHHMM(p.open.time).minutes;
    const closeMin = p.close.day * 24 * 60 + parseHHMM(p.close.time).hours * 60 + parseHHMM(p.close.time).minutes;
    if (nowAbs >= openMin && nowAbs < closeMin) {
      return {
        kind: 'open',
        closesAt: p.close.time,
        closesAtLabel: formatTime12h(p.close.time),
      };
    }
  }

  // 2) Find the next opening within the next 7 days. We extend each
  //    period's "day" forward by 7 (wrapping modulo 7) so a Tuesday
  //    opening still appears on next Monday's query.
  const openings = buildNextOpenings(oh.periods);
  // Walk forward: first check this week's openings (already past → skip),
  // then wrap to next week (add 7*24*60 to the absolute minute).
  const candidates: NextOpening[] = [
    ...openings.map((o) => ({ ...o })),
    ...openings.map((o) => ({ ...o, openAbs: o.openAbs + 7 * 24 * 60 })),
  ];

  for (const cand of candidates) {
    if (cand.openAbs <= nowAbs) continue;
    const offset = Math.floor((cand.openAbs - nowAbs) / (24 * 60));
    let dayLabel: string;
    if (offset === 0) {
      dayLabel = 'today';
    } else if (offset === 1) {
      dayLabel = 'tomorrow';
    } else {
      const targetDay = cand.period.open.day; // 0-6
      dayLabel = DAY_NAMES_SHORT[targetDay];
    }
    const timeLabel = formatTime12h(cand.period.open.time);
    return {
      kind: 'closed',
      nextOpen: cand.period.open.time,
      nextOpenLabel: offset === 0 || offset === 1 ? timeLabel : `${timeLabel} ${dayLabel}`,
    };
  }

  return { kind: 'unknown' };
}
