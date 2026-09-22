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
 * Best-effort league detection from team names. Returns canonical league
 * code ('NHL', 'KHL', 'SHL', etc.) or null if ambiguous.
 * Added 2026-09-21 per Arnel's 'every league must produce verified articles'
 * directive — Highlightly's unfiltered date search returns <50 games across
 * ~20 leagues and silently OMITS KHL/SHL/DEL/etc., so we must pass leagueId.
 */
function guessLeagueFromTeams(teams) {
  const joined = teams.join(' ').toLowerCase();
  // Strong-typed league signals (specific team names).
  // Verified live 2026-09-21: HL returns SHORT names ("Magnitogorsk" not
  // "Metallurg Magnitogorsk"), so we list both forms.
  // 2026-09-21: added missing team names that the original regex missed
  // (Magnitogorsk, Nizhnekamsk, Karpat, Ässät, etc.) — these caused
  // getMatchData to return null and articles to fail at LLM step.
  if (/(salavat yulaev|ak bars|akbars|metallurg magnitogorsk|magnitogorsk|nizhnekamsk|avangard omsk|avangard|cska moscow|cska|dynamo moscow|dynamo msk|locomotiv|torpedo nn|kunlun|severstal|admiral|amur|khabarovsk|avtomobilist|avangard|barys|traktor|shanghai dragons|sibir|sochi|spartak|yunost|red star|kunlun|sk a|ska|hc sochi|hc spartak|amur khabarovsk|tambov|metallurg|niznekamsk|dinamo minsk|minsk|yekaterinburg|avtomobilist|hc torpedo|hc lokomotiv|hc dinamo|hc bars|sk a saint|ska saint|kunlun red star|hc admiral|hc amur)/i.test(joined)) return 'KHL';
  if (/(frölunda|frölunda hc|färjestad|skellefteå|växjö Lakers|växjö|djurgården|if björklöven|hc sport|Modo Hockey|Linköping|Rögle Brynäs|Luleå|HV71|malmo|tre kronor|brynas|skelleftea|vaxjo Lakers|farjestad|frolunda hc|rogle|bjorkloven|rogle bjorkloven)/i.test(joined)) return 'SHL';
  if (/(adler mannheim|adler|eisbären|eisbaren|köln|koln|münchen|munchen|red bull münchen|berlin|nürnberg|nurnberg|ingolstadt|bremerhaven|straubing|schwenningen|augsburger|krefeld|i Fischtown|fischtown|iserlohn|iserlohn roosters|deggendorf|lowen|lowen frankfurt)/i.test(joined)) return 'DEL';
  if (/(tps|tappara|hifk|jokerit|hockey eagles|kärpät|karpät|karpat|älhlet|allas|äsä|assa|ilves|saipa|kalpa|jyp|pelicans|pelicans lahti|sport vaasa|hp|hpk|hämeenlinna|hameenlinna|lukko|ässät|jäähonka|assat|honka|aesätaeäsaeaetääs|jyp|hpk|kookoo|saipa|Ässät|Ässäät|Jäähonka|Ässät Ässäät|Jäähonka)/i.test(joined)) return 'Liiga';
  if (/(belleville senators|laval rocket|manitoba moose|hartford wolf pack|springfield thunderbirds|wilkes-barre|lehigh valley|grand rapids|charlotte|syracuse crunch|texas stars|san jose barrage|san diego gulls|ontario reign|bakersfield|colorado eagles)/i.test(joined)) return 'AHL';
  if (/(oshawa|ottawa 67|barrie colts|kingston|brampton battalion|hamilton bulldogs|north bay|mississauga|erie otters|kitchener|london knights|oshawa generals|niagara iceDogs|owen sound|peterborough|saginaw spirit|sault ste. marie|windsor spitfires|generals|67's|67s|ottawa 67s|kingston frontenacs)/i.test(joined)) return 'OHL';
  if (/(red deer rebels|swift current|brandon wheat kings|medicine hat tigers|edmonton oil kings|calgary hitmen|lethbridge|moose jaw|regina pats|saskatoon blades|tri-city americans|spokane chiefs|wenatchee wild|kamloops blazers|kelowna rockets|portland winterhawks|seattle thunderbirds|everett silvertips|vancouver giants|prince george cougars|victoria royals|cougars|blades|warriors|rebels|tigers|wheat kings|wild|chiefs|giants|broncos|hurricanes|pats|americans|oilers|hitmen)/i.test(joined)) return 'WHL';
  if (/(armada|drakkar|foreurs|remparts|phoenix|huskies|wildcats|tigres|cataractes|saguenéens|sagueneens|olympiques|riverains|celtique|chicoutimi|val-d'or|rouyn-noranda|baie-comeau|gatineau|quebec|chicoutimi|sagueneens|oceanic|armada blainville|phoenix de sherbrooke)/i.test(joined)) return 'QMJHL';
  return null;
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
  // Per-league HL ID map (verified live 2026-09-21). Highlightly's unfiltered
  // date search returns <50 games across ~20 leagues and silently omits leagues
  // like KHL/SHL/DEL/etc. So when the article pipeline needs a specific league,
  // we must pass leagueId explicitly. Added 2026-09-21 per Arnel's 'every league
  // must produce verified articles' directive.
  const LEAGUE_HL_IDS = {
    'NHL': 0,             // NHL endpoint is separate (nhl.highlightly.net)
    'AHL': 50142,
    'OHL': 3337,
    'WHL': 4188,
    'QMJHL': 5161,
    'SHL': 40781,
    'DEL': 16953,
    'KHL': 30569,
    'MHL': 32271,
    'VHL': 31420,
    'SPHL': 51844,
    'Liiga': 14400,
  };
  // Determine the HL league ID from the team names (best-effort). If we can't
  // determine, fall back to unfiltered date search.
  const guessedLeague = guessLeagueFromTeams(teams);
  const leagueHlId = guessedLeague ? LEAGUE_HL_IDS[guessedLeague] : null;

  const d0 = new Date(date + 'T00:00:00Z');
  const dayBefore = new Date(d0); dayBefore.setUTCDate(d0.getUTCDate() - 1);
  const dayAfter = new Date(d0); dayAfter.setUTCDate(d0.getUTCDate() + 1);
  const dates = [dayBefore.toISOString().slice(0, 10), date, dayAfter.toISOString().slice(0, 10)];
  for (const ep of endpoints) {
    for (const d of dates) {
      try {
        // If we know the league, only query the appropriate endpoint with leagueId
        const queryLeague = ep.base.includes('nhl.') ? 'NHL' : (guessedLeague === 'NHL' ? null : guessedLeague);
        let url = `${ep.base}/matches?date=${d}&limit=50`;
        if (queryLeague && LEAGUE_HL_IDS[queryLeague] && LEAGUE_HL_IDS[queryLeague] !== 0) {
          url += `&leagueId=${LEAGUE_HL_IDS[queryLeague]}`;
        }
        const res = await fetch(url, {
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
