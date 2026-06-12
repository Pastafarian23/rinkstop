/**
 * TheSportsDB adapter
 *
 * Built 2026-06-12 per Arnel's directive to "build league specific source
 * adapters. Use hockey tech and highlightly as secondary sources to verify
 * the information is correct."
 *
 * TheSportsDB has surprisingly good coverage for non-NHL leagues via
 * `eventsday.php?d=...&l=LEAGUE_ID` and `searchevents.php?e=...`. Free
 * tier with API key `3`; can be upgraded to a paid key for higher rate
 * limits and historical depth. We use it as the PRIMARY source for the
 * leagues it covers, with HockeyTech/KHL/IIHF as secondary verification.
 *
 * League IDs (verified 2026-06-12):
 *   4925 = DEL (Germany)
 *   4419 = SHL (Sweden)
 *   4920 = KHL (Russia)
 *   4919 = VHL (Russia)
 *   5643 = Memorial Cup (Canada)
 *   4934 = Swiss National League
 *   5159 = OHL
 *   5161 = QMJHL
 *   5157 = WHL (from settings.py repo)
 *   4973 = SPHL (from settings.py repo)
 *   4629 = Hockey Allsvenskan (from settings.py repo)
 *   4381 = Liiga (from settings.py repo)
 *
 * Note: search is by exact event name string ("Luleå HF vs Skellefteå AIK"),
 * so we try a few variations per game (home-away, away-home, accent/no-accent).
 */

import { isFinalScore } from '../match-data.mjs';

const SPORTSDB_KEY = process.env.SPORTSDB_API_KEY || '3'; // free tier default
const TSDB_BASE = 'https://www.thesportsdb.com/api/v1/json';

const LEAGUE_TSDB_IDS = {
  DEL: 4925,
  'German DEL': 4925,
  SHL: 4419,
  'Swedish Hockey League': 4419,
  KHL: 4920,
  'Kontinental Hockey League': 4920,
  VHL: 4919,
  MHL: 4920, // MHL not in TSDB; fall back to KHL coverage
  'Memorial Cup': 5643,
  'Canadian Memorial Cup': 5643,
  NL: 4934,
  'Swiss National League': 4934,
  'National League': 4934,
  OHL: 5159,
  'Ontario Hockey League': 5159,
  QMJHL: 5161,
  'LHJMQ': 5161,
  'Quebec Major Junior Hockey League': 5161,
  WHL: 5157,
  'Western Hockey League': 5157,
  SPHL: 4973,
  'American SPHL': 4973,
  'Southern Professional Hockey': 4973,
  Allsvenskan: 4629,
  'Hockey Allsvenskan': 4629,
  Liiga: 4381,
  'Finnish Liiga': 4381,
};

const _rateLimitMs = 1500; // TSDB free tier allows ~40 req/min
let _lastCall = 0;
let _rateLimitBackoffUntil = 0;
async function tsdbFetch(path) {
  if (Date.now() < _rateLimitBackoffUntil) {
    await new Promise(r => setTimeout(r, _rateLimitBackoffUntil - Date.now()));
  }
  const wait = Math.max(0, _lastCall + _rateLimitMs - Date.now());
  if (wait) await new Promise(r => setTimeout(r, wait));
  _lastCall = Date.now();
  const url = `${TSDB_BASE}/${SPORTSDB_KEY}${path}`;
  const r = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh) AppleWebKit/537.36' },
    signal: AbortSignal.timeout(6000),
  });
  if (r.status === 429 || r.status === 1015) {
    _rateLimitBackoffUntil = Date.now() + 30000;
    return null;
  }
  if (!r.ok) return null;
  try { return await r.json(); } catch { return null; }
}

function normalizeName(s) {
  return (s || '').toLowerCase()
    .replace(/[åä]/g, 'a')
    .replace(/[öôö]/g, 'o')
    .replace(/[éèë]/g, 'e')
    .replace(/[üû]/g, 'u')
    .replace(/ß/g, 'ss')
    .replace(/['\u2018\u2019]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Slavic/Russian transliteration equivalence: y/i, e/ye, etc.
// Used to handle e.g. "Almetyevsk" (English) vs "Almetievsk" (Russian).
function translitEquiv(a, b) {
  if (a === b) return true;
  // Replace y<->i in both, then compare
  const a2 = a.replace(/y/g, 'i');
  const b2 = b.replace(/y/g, 'i');
  if (a2 === b2) return true;
  // Strip common prefixes: HC, FK, HC Yugra -> Yugra, etc.
  return false;
}

function teamMatches(search, candidate) {
  if (!search || !candidate) return false;
  const a = normalizeName(search);
  const b = normalizeName(candidate);
  if (a === b) return true;
  // Last word match (e.g. "Luleå HF" -> "hf", "Fribourg-Gottéron" -> "gotteron")
  const aLast = a.split(' ').pop();
  const bLast = b.split(' ').pop();
  if (aLast && aLast.length >= 3 && translitEquiv(aLast, bLast)) return true;
  // Contains
  if (b.includes(a) || a.includes(b)) return true;
  // Levenshtein-style fuzzy: allow 1 char difference in the last word
  // (handles Almetyevsk vs Almetievsk, etc.)
  if (aLast && bLast && aLast.length >= 6 && bLast.length >= 6 && Math.abs(aLast.length - bLast.length) <= 1) {
    let diffs = 0;
    const len = Math.min(aLast.length, bLast.length);
    for (let i = 0; i < len; i++) if (aLast[i] !== bLast[i]) diffs++;
    if (diffs + Math.abs(aLast.length - bLast.length) <= 1) return true;
  }
  return false;
}

function eventMatchesGame(event, homeTeam, awayTeam) {
  if (!event || !event.strHomeTeam || !event.strAwayTeam) return false;
  // Either home/away order
  return (
    (teamMatches(homeTeam, event.strHomeTeam) && teamMatches(awayTeam, event.strAwayTeam)) ||
    (teamMatches(awayTeam, event.strHomeTeam) && teamMatches(homeTeam, event.strAwayTeam))
  );
}

function eventToMatchData(event) {
  if (!event) return null;
  const homeScore = parseInt(event.intHomeScore, 10);
  const awayScore = parseInt(event.intAwayScore, 10);
  if (isNaN(homeScore) || isNaN(awayScore)) return null;
  const score = `${homeScore}-${awayScore}`;
  if (!isFinalScore(score)) return null;
  // WasOT/WasSO detection: TSDB stores period scores; OT/SO format varies
  const isOT = /[oO][tT]\b/.test(event.strResult || event.strDescription || '');
  const isSO = /[sS][oO]\b|[pP][eE]/.test(event.strResult || event.strDescription || '');
  return {
    source: 'thesportsdb',
    gameId: event.idEvent,
    home: event.strHomeTeam,
    away: event.strAwayTeam,
    score,
    wasOT: isOT && !isSO,
    wasSO: isSO,
    venue: event.strVenue || null,
    startTimeUTC: event.dateEvent ? `${event.dateEvent}T${event.strTime || '00:00:00'}Z` : null,
    description: event.strLeague || null,
    league: event.strLeague,
  };
}

function dateVariants(date) {
  // ±1 day for timezone buffer
  const d0 = new Date(date + 'T00:00:00Z');
  if (isNaN(d0)) return [date];
  const before = new Date(d0); before.setUTCDate(d0.getUTCDate() - 1);
  const after = new Date(d0); after.setUTCDate(d0.getUTCDate() + 1);
  return [before.toISOString().slice(0, 10), date, after.toISOString().slice(0, 10)];
}

/**
 * Look up a game via TSDB. Tries the eventsday endpoint for the date range,
 * then falls back to searchevents with a few string variations.
 */
export async function thesportsdbMatchData({ teams, date, league }) {
  const tsdbLeagueId = LEAGUE_TSDB_IDS[league] || LEAGUE_TSDB_IDS[Object.keys(LEAGUE_TSDB_IDS).find(k => k.toLowerCase() === (league || '').toLowerCase())];
  if (!tsdbLeagueId) return null;
  const [homeTeam, awayTeam] = teams;
  // Try 1: eventsday.php for each date in range (best for date-known games)
  for (const d of dateVariants(date)) {
    const j = await tsdbFetch(`/eventsday.php?d=${d}&l=${tsdbLeagueId}`);
    if (!j || !j.events) continue;
    for (const ev of j.events) {
      if (eventMatchesGame(ev, homeTeam, awayTeam)) {
        const m = eventToMatchData(ev);
        if (m) return m;
      }
    }
  }
  // Try 2: searchevents.php with "Home vs Away" variations (use accents first)
  const homeRaw = homeTeam.trim();
  const awayRaw = awayTeam.trim();
  const variations = [
    `${homeRaw} vs ${awayRaw}`,
    `${awayRaw} vs ${homeRaw}`,
    `${homeRaw.replace(/[åäöéè]/g, c => ({ 'å': 'a', 'ä': 'a', 'ö': 'o', 'é': 'e', 'è': 'e' }[c]))} vs ${awayRaw.replace(/[åäöéè]/g, c => ({ 'å': 'a', 'ä': 'a', 'ö': 'o', 'é': 'e', 'è': 'e' }[c]))}`,
  ];
  for (const query of variations) {
    const j = await tsdbFetch(`/searchevents.php?e=${encodeURIComponent(query)}`);
    if (!j || !j.event) continue;
    for (const ev of j.event) {
      if (eventMatchesGame(ev, homeTeam, awayTeam)) {
        const m = eventToMatchData(ev);
        if (m) return m;
      }
    }
  }
  // Try 3: team-only search. TSDB often has shorter team names than our
  // highlights (e.g. our "HC Yugra Khanty-Mansiysk" vs TSDB's "HC Yugra").
  // Search for the away team and filter results by date+opponent match.
  for (const team of [homeRaw, awayRaw]) {
    const j = await tsdbFetch(`/searchevents.php?e=${encodeURIComponent(team)}`);
    if (!j || !j.event) continue;
    for (const ev of j.event) {
      if (!eventMatchesGame(ev, homeTeam, awayTeam)) continue;
      const evDate = ev.dateEvent || '';
      if (evDate && dateVariants(date).includes(evDate)) {
        const m = eventToMatchData(ev);
        if (m) return m;
      }
    }
  }
  return null;
}

/**
 * Returns the TheSportsDB league ID for a given league key, or null.
 */
export function thesportsdbLeagueId(league) {
  if (!league) return null;
  return LEAGUE_TSDB_IDS[league] || LEAGUE_TSDB_IDS[Object.keys(LEAGUE_TSDB_IDS).find(k => k.toLowerCase() === league.toLowerCase())] || null;
}
