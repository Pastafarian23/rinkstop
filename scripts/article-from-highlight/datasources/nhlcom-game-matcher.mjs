#!/usr/bin/env node
/**
 * datasources/nhlcom-game-matcher.mjs
 *
 * Given a highlight (home_team_name, away_team_name, match_date), find the
 * real NHL.com game id. The match_id stored in highlight_backups is a
 * Highlightly sandbox id, NOT a real NHL.com game id. We resolve it by
 * querying the NHL.com schedule for the date +/- 1 day (Pacific Time
 * buffer) and matching on team abbreviations.
 *
 * Returns: { gameId, homeAbbrev, awayAbbrev, score } or null if no match.
 *
 * Important: only matches games where home/away match exactly. Does NOT
 * swap teams, because returning a swapped game would put the wrong team
 * as "home" in the article. Also requires the game to be in a final
 * state (gameState OFF/FINAL) with non-null scores.
 */

const NHL_API = 'https://api-web.nhle.com/v1';

const TEAMS = {
  'Anaheim Ducks': 'ANA', 'Ducks': 'ANA', 'ANA': 'ANA',
  'Arizona Coyotes': 'ARI', 'Coyotes': 'ARI', 'ARI': 'ARI',
  'Boston Bruins': 'BOS', 'Bruins': 'BOS', 'BOS': 'BOS',
  'Buffalo Sabres': 'BUF', 'Sabres': 'BUF', 'BUF': 'BUF',
  'Calgary Flames': 'CGY', 'Flames': 'CGY', 'CGY': 'CGY',
  'Carolina Hurricanes': 'CAR', 'Hurricanes': 'CAR', 'CAR': 'CAR',
  'Chicago Blackhawks': 'CHI', 'Blackhawks': 'CHI', 'CHI': 'CHI',
  'Colorado Avalanche': 'COL', 'Avalanche': 'COL', 'COL': 'COL',
  'Columbus Blue Jackets': 'CBJ', 'Blue Jackets': 'CBJ', 'CBJ': 'CBJ',
  'Dallas Stars': 'DAL', 'Stars': 'DAL', 'DAL': 'DAL',
  'Detroit Red Wings': 'DET', 'Red Wings': 'DET', 'DET': 'DET',
  'Edmonton Oilers': 'EDM', 'Oilers': 'EDM', 'EDM': 'EDM',
  'Florida Panthers': 'FLA', 'Panthers': 'FLA', 'FLA': 'FLA',
  'Los Angeles Kings': 'LAK', 'Kings': 'LAK', 'LAK': 'LAK',
  'Minnesota Wild': 'MIN', 'Wild': 'MIN', 'MIN': 'MIN',
  'Montreal Canadiens': 'MTL', 'Canadiens': 'MTL', 'MTL': 'MTL', 'Montréal Canadiens': 'MTL',
  'Nashville Predators': 'NSH', 'Predators': 'NSH', 'NSH': 'NSH',
  'New Jersey Devils': 'NJD', 'Devils': 'NJD', 'NJD': 'NJD',
  'New York Islanders': 'NYI', 'Islanders': 'NYI', 'NYI': 'NYI',
  'New York Rangers': 'NYR', 'Rangers': 'NYR', 'NYR': 'NYR',
  'Ottawa Senators': 'OTT', 'Senators': 'OTT', 'OTT': 'OTT',
  'Philadelphia Flyers': 'PHI', 'Flyers': 'PHI', 'PHI': 'PHI',
  'Pittsburgh Penguins': 'PIT', 'Penguins': 'PIT', 'PIT': 'PIT',
  'San Jose Sharks': 'SJS', 'Sharks': 'SJS', 'SJS': 'SJS',
  'Seattle Kraken': 'SEA', 'Kraken': 'SEA', 'SEA': 'SEA',
  'St. Louis Blues': 'STL', 'Blues': 'STL', 'STL': 'STL',
  'St Louis Blues': 'STL',
  'Tampa Bay Lightning': 'TBL', 'Lightning': 'TBL', 'TBL': 'TBL',
  'Toronto Maple Leafs': 'TOR', 'Maple Leafs': 'TOR', 'TOR': 'TOR',
  'Utah Hockey Club': 'UTA', 'Utah': 'UTA', 'UTA': 'UTA',
  'Utah Mammoth': 'UTA', 'Mammoth': 'UTA',
  'Vancouver Canucks': 'VAN', 'Canucks': 'VAN', 'VAN': 'VAN',
  'Vegas Golden Knights': 'VGK', 'Golden Knights': 'VGK', 'VGK': 'VGK',
  'Washington Capitals': 'WSH', 'Capitals': 'WSH', 'WSH': 'WSH',
  'Winnipeg Jets': 'WPG', 'Jets': 'WPG', 'WPG': 'WPG',
};

function nameToAbbrev(name) {
  if (!name) return null;
  if (TEAMS[name]) return TEAMS[name];
  for (const [k, v] of Object.entries(TEAMS)) {
    if (k.toLowerCase() === name.toLowerCase()) return v;
  }
  const last = name.split(/\s+/).pop();
  if (TEAMS[last]) return TEAMS[last];
  const noThe = name.replace(/^the\s+/i, '').trim();
  if (TEAMS[noThe]) return TEAMS[noThe];
  for (const [k, v] of Object.entries(TEAMS)) {
    if (noThe.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(noThe.toLowerCase())) {
      return v;
    }
  }
  return null;
}

/**
 * Find the real NHL.com game id for a given highlight.
 *
 * @param {string} homeTeam - highlight_backups.home_team_name
 * @param {string} awayTeam - highlight_backups.away_team_name
 * @param {string} date - YYYY-MM-DD (UTC date of the game)
 * @returns {Promise<{gameId: number, homeAbbrev: string, awayAbbrev: string, score: string} | null>}
 */
export async function findNhlGameId(homeTeam, awayTeam, date) {
  const homeAb = nameToAbbrev(homeTeam);
  const awayAb = nameToAbbrev(awayTeam);
  if (!homeAb || !awayAb) return null;
  if (!date) return null;

  // Try date +/- 1 day. The match_date in highlight_backups is the UTC
  // date, but the NHL.com schedule API indexes games by their Pacific
  // Time start date. A game that started at 5pm PT on 2026-06-09
  // (00:00 UTC 2026-06-10) will be on the schedule/2026-06-09, NOT
  // schedule/2026-06-10.
  const d0 = new Date(date + 'T00:00:00Z');
  const dates = [date];
  for (let off = -1; off <= 1; off++) {
    const d = new Date(d0);
    d.setUTCDate(d0.getUTCDate() + off);
    const iso = d.toISOString().slice(0, 10);
    if (!dates.includes(iso)) dates.push(iso);
  }

  for (const d of dates) {
    try {
      const res = await fetch(`${NHL_API}/schedule/${d}`, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) continue;
      const j = await res.json();
      for (const day of (j.gameWeek || [])) {
        for (const g of (day.games || [])) {
          // Only match if home/away match exactly. We do NOT swap, because
          // returning a swapped game would put the wrong team as "home" in
          // the article.
          if (g.homeTeam?.abbrev === homeAb && g.awayTeam?.abbrev === awayAb) {
            // Skip unplayed or in-progress games.
            if (g.gameState !== 'OFF' && g.gameState !== 'FINAL') continue;
            if (g.awayTeam?.score == null || g.homeTeam?.score == null) continue;
            return { gameId: g.id, homeAbbrev: homeAb, awayAbbrev: awayAb, score: `${g.awayTeam?.score}-${g.homeTeam?.score}` };
          }
        }
      }
    } catch (e) {
      continue;
    }
  }
  return null;
}

export { nameToAbbrev };
