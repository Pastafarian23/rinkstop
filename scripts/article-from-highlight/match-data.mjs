#!/usr/bin/env node
/**
 * match-data.mjs
 *
 * Multi-source match data lookup. Centralized so all scripts use the same
 * logic: try Highlightly first, then fall back to NHL.com (and other
 * league-specific sources as they're added).
 *
 * Returns a normalized object with these fields:
 *   {
 *     source: 'highlightly' | 'nhl.com' | etc.
 *     home_team, away_team: string
 *     league: string
 *     score: 'X - Y' (away-home per API convention; verify with article text)
 *     wasOT: boolean
 *     wasSO: boolean
 *     description: string
 *     ... (extra fields per source)
 *   }
 *
 * Usage:
 *   import { getMatchData } from './match-data.mjs';
 *   const data = await getMatchData({ teams: ['Maple Leafs', 'Capitals'], date: '2026-04-08', league: 'NHL', apiKey: '...' });
 */

import { readFileSync, existsSync } from 'fs';
import { nhlcomMatchData } from './datasources/nhlcom.mjs';
import { hockeytechMatchData } from './datasources/hockeytech.mjs';
import { ncaaMatchData } from './datasources/ncaa.mjs';
import { khlMatchData } from './datasources/khl.mjs';
import { iihfMatchData } from './datasources/iihf.mjs';

// Load .env if present so callers don't have to pass apiKey explicitly
const ENV_FILE = '/root/.openclaw/workspace/rinkstop-platform/.env';
if (existsSync(ENV_FILE) && !process.env.HIGHLIGHTLY_API_KEY) {
  for (const line of readFileSync(ENV_FILE, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

/**
 * Normalize league_name from highlight_backups, which can be:
 *  - a string like 'NHL'
 *  - a JSON string like '{"id":49291,"name":"NHL","logo":"..."}'
 *  - an object {id, name, logo}
 * Returns just the league name (e.g. 'NHL').
 */
export function normalizeLeague(leagueRaw) {
  if (!leagueRaw) return '';
  if (typeof leagueRaw === 'object') return leagueRaw.name || '';
  if (typeof leagueRaw === 'string') {
    const trimmed = leagueRaw.trim();
    if (trimmed.startsWith('{')) {
      try { return JSON.parse(trimmed).name || ''; } catch {}
    }
    return trimmed;
  }
  return '';
}

/**
 * Internal: query Highlightly. Returns normalized object or null.
 */
async function highlightlyMatch(teams, date, apiKey) {
  if (!apiKey || !teams.length || !date) return null;
  const teamKeys = teams.map(t => {
    const noThe = t.replace(/^the\s+/i, '').toLowerCase().trim();
    return { full: noThe, last: noThe.split(/\s+/).pop() };
  });
  const endpoints = [
    { base: 'https://hockey.highlightly.net', host: 'hockey-highlights-api.p.rapidapi.com' },
    { base: 'https://nhl.highlightly.net', host: 'nhl-ncaah-api.p.rapidapi.com' },
  ];
  const d0 = new Date(date + 'T00:00:00Z');
  const dayBefore = new Date(d0); dayBefore.setUTCDate(d0.getUTCDate() - 1);
  const dayAfter = new Date(d0); dayAfter.setUTCDate(d0.getUTCDate() + 1);
  const dates = [dayBefore.toISOString().slice(0, 10), date, dayAfter.toISOString().slice(0, 10)];
  for (const ep of endpoints) {
    for (const d of dates) {
      try {
        const res = await fetch(`${ep.base}/matches?date=${d}&limit=20`, {
          headers: {
            'x-rapidapi-key': apiKey,
            'x-rapidapi-host': ep.host,
          },
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) continue;
        const j = await res.json();
        for (const m of (j.data || [])) {
          const homeName = (m.homeTeam?.name || m.homeTeam?.displayName || '').toLowerCase();
          const awayName = (m.awayTeam?.name || m.awayTeam?.displayName || '').toLowerCase();
          const homeHas = teamKeys.some(k => homeName.includes(k.last) || homeName.includes(k.full));
          const awayHas = teamKeys.some(k => awayName.includes(k.last) || awayName.includes(k.full));
          if (homeHas && awayHas) {
            const sc = m.state?.score || {};
            const current = sc.current || '';
            const otGoals = sc.overTime && sc.overTime !== '0 - 0' && sc.overTime !== '0-0';
            const soGoals = sc.penalties && sc.penalties !== '0 - 0' && sc.penalties !== '0-0';
            return {
              source: 'highlightly',
              home_team: m.homeTeam?.name || m.homeTeam?.displayName,
              away_team: m.awayTeam?.name || m.awayTeam?.displayName,
              league: m.league?.name,
              gameId: m.id,
              score: current,
              wasOT: otGoals,
              wasSO: soGoals,
              description: m.state?.description,
              firstPeriod: sc.firstPeriod,
              secondPeriod: sc.secondPeriod,
              thirdPeriod: sc.thirdPeriod,
              overTimeGoals: sc.overTime,
              penalties: sc.penalties,
            };
          }
        }
      } catch {}
    }
  }
  return null;
}

/**
 * isFinalScore: a 'score' string is only a usable final score if it parses
 * as two integers separated by a dash (e.g. '3 - 5', '3-5'). Status strings
 * like 'Not started', 'Scheduled', 'Live', 'In Progress', 'Postponed',
 * 'Cancelled' are NOT scores and must be rejected by all consumers.
 *
 * Centralizing this check prevents the bug where a stale Highlightly
 * 'Not started' value was treated as a valid final score (truthy string)
 * and short-circuited the NHL.com fallback, letting fabricated LLM scores
 * pass verification.
 */
export function isFinalScore(score) {
  if (typeof score !== 'string' && typeof score !== 'number') return false;
  const s = String(score).trim();
  if (!/^\d+\s*[-–—]\s*\d+$/.test(s)) return false;
  return true;
}

/**
 * Multi-source match data lookup. Tries each source in priority order.
 *
 * Priority (as of 2026-06-12 fix):
 *   - For NHL: NHL.com is the source of truth. Highlightly has historically
 *     had stale/wrong data for Stanley Cup Final games (returning "Not started"
 *     days after the game ended), so we MUST consult NHL.com first.
 *   - For non-NHL leagues: Highlightly is still tried first (best coverage),
 *     then league-specific fallbacks.
 *
 * @param {object} opts
 * @param {string[]} opts.teams - [homeTeam, awayTeam] (order doesn't matter for matching)
 * @param {string} opts.date - 'YYYY-MM-DD'
 * @param {string} [opts.league] - 'NHL', 'AHL', etc. (used to skip sources that don't apply)
 * @param {string} [opts.apiKey] - Highlightly API key
 * @returns {Promise<object|null>} normalized match data with a final numeric score
 */
export async function getMatchData({ teams, date, league, apiKey }) {
  if (!teams || !teams.length || !date) return null;
  const effectiveKey = apiKey || process.env.HIGHLIGHTLY_API_KEY;
  const leagueUpper = (league || '').toUpperCase();

  // 1. For NHL games, NHL.com is the source of truth. Try first.
  //    This is the change that prevents fabricated scores from passing
  //    verification when Highlightly returns stale or wrong data.
  if (leagueUpper === 'NHL') {
    const nhl = await nhlcomMatchData(teams, date);
    if (nhl && isFinalScore(nhl.score)) {
      nhl._primarySource = 'nhl.com';
      return nhl;
    }
  }

  // 2. Highlightly (covers NHL, AHL, IIHF, Memorial Cup, QMJHL, OHL, ECHL, WHL, KHL)
  //    Skip if it returned a non-numeric status string (e.g. 'Not started').
  const hl = await highlightlyMatch(teams, date, effectiveKey);
  if (hl && isFinalScore(hl.score)) return hl;

  // 3. For NHL, if Highlightly didn't return a final score, try NHL.com again
  //    (it might have data for the date Highlightly didn't).
  if (leagueUpper === 'NHL') {
    const nhl = await nhlcomMatchData(teams, date);
    if (nhl && isFinalScore(nhl.score)) {
      nhl._primarySource = 'nhl.com (fallback)';
      return nhl;
    }
  }

  // 4. HockeyTech (official stats provider for AHL, ECHL, OHL, WHL, QMJHL, USHL, PWHL)
  const ht = await hockeytechMatchData({ teams, date, league });
  if (ht && isFinalScore(ht.score)) return ht;

  // 5. NCAA (covers icehockey-men/d1 and icehockey-women/d1)
  const ncaa = await ncaaMatchData({ teams, date, league });
  if (ncaa && isFinalScore(ncaa.score)) return ncaa;

  // 6. KHL/WHL/MHL (Russian leagues, public mobile API)
  const khl = await khlMatchData({ teams, date, league });
  if (khl && isFinalScore(khl.score)) return khl;

  // 7. IIHF World Championship (fixturedownload.com JSON feed)
  const iihf = await iihfMatchData({ teams, date, league });
  if (iihf && isFinalScore(iihf.score)) return iihf;

  return null;
}

export { highlightlyMatch, nhlcomMatchData, hockeytechMatchData, ncaaMatchData, khlMatchData, iihfMatchData };
