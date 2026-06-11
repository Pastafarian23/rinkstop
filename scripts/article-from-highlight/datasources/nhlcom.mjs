#!/usr/bin/env node
/**
 * datasources/nhlcom.mjs
 *
 * Data source for NHL games via the public NHL.com API (api-web.nhle.com).
 * No authentication required.
 *
 * Used as a fallback when Highlightly doesn't have a game (e.g., NHL regular
 * season pre-trade-deadline, which Highlightly doesn't cover).
 *
 * Endpoints used:
 *  - GET /v1/schedule/{YYYY-MM-DD}  — list all games on a given date
 *  - GET /v1/gamecenter/{game_id}/play-by-play — full PBP (only if needed)
 *
 * Returns data in the same shape as highlightlyMatchData() so the rest of
 * the pipeline can use it transparently.
 */

/**
 * Convert a team name (as written in our YouTube highlight backup) to a
 * set of possible NHL team abbreviations/abbrev prefixes.
 *
 * Returns a Set of abbrev strings. We match by 'abbrev' or 'commonName'
 * substring so "Maple Leafs" matches "TOR" because the team's common
 * name is "Maple Leafs".
 */
const NHL_TEAMS = {
  'Anaheim Ducks': 'ANA', 'Ducks': 'ANA',
  'Arizona Coyotes': 'ARI',
  'Boston Bruins': 'BOS', 'Bruins': 'BOS',
  'Buffalo Sabres': 'BUF', 'Sabres': 'BUF',
  'Calgary Flames': 'CGY', 'Flames': 'CGY',
  'Carolina Hurricanes': 'CAR', 'Hurricanes': 'CAR',
  'Chicago Blackhawks': 'CHI', 'Blackhawks': 'CHI',
  'Colorado Avalanche': 'COL', 'Avalanche': 'COL',
  'Columbus Blue Jackets': 'CBJ', 'Blue Jackets': 'CBJ',
  'Dallas Stars': 'DAL', 'Stars': 'DAL',
  'Detroit Red Wings': 'DET', 'Red Wings': 'DET',
  'Edmonton Oilers': 'EDM', 'Oilers': 'EDM',
  'Florida Panthers': 'FLA', 'Panthers': 'FLA',
  'Los Angeles Kings': 'LAK', 'Kings': 'LAK',
  'Minnesota Wild': 'MIN', 'Wild': 'MIN',
  'Montreal Canadiens': 'MTL', 'Canadiens': 'MTL', 'Montréal Canadiens': 'MTL',
  'Nashville Predators': 'NSH', 'Predators': 'NSH',
  'New Jersey Devils': 'NJD', 'Devils': 'NJD',
  'New York Islanders': 'NYI', 'Islanders': 'NYI',
  'New York Rangers': 'NYR', 'Rangers': 'NYR',
  'Ottawa Senators': 'OTT', 'Senators': 'OTT',
  'Philadelphia Flyers': 'PHI', 'Flyers': 'PHI',
  'Pittsburgh Penguins': 'PIT', 'Penguins': 'PIT',
  'San Jose Sharks': 'SJS', 'Sharks': 'SJS',
  'Seattle Kraken': 'SEA', 'Kraken': 'SEA',
  'St. Louis Blues': 'STL', 'Blues': 'STL', 'St Louis Blues': 'STL',
  'Tampa Bay Lightning': 'TBL', 'Lightning': 'TBL',
  'Toronto Maple Leafs': 'TOR', 'Maple Leafs': 'TOR',
  'Utah Mammoth': 'UTA', 'Mammoth': 'UTA',
  'Vancouver Canucks': 'VAN', 'Canucks': 'VAN',
  'Vegas Golden Knights': 'VGK', 'Golden Knights': 'VGK',
  'Washington Capitals': 'WSH', 'Capitals': 'WSH',
  'Winnipeg Jets': 'WPG', 'Jets': 'WPG',
};

function teamsToAbbrevs(teams) {
  const abbrevs = new Set();
  for (const t of teams) {
    const noThe = t.replace(/^the\s+/i, '').trim();
    // Direct lookup
    if (NHL_TEAMS[noThe]) abbrevs.add(NHL_TEAMS[noThe]);
    // Try last word
    const last = noThe.split(/\s+/).pop();
    if (NHL_TEAMS[last]) abbrevs.add(NHL_TEAMS[last]);
    // Try full name match
    for (const [name, abbrev] of Object.entries(NHL_TEAMS)) {
      if (noThe.toLowerCase().includes(name.toLowerCase()) ||
          name.toLowerCase().includes(noThe.toLowerCase())) {
        abbrevs.add(abbrev);
      }
    }
  }
  return abbrevs;
}

/**
 * Get NHL.com match data for given teams and date.
 * Returns the same shape as highlightlyMatchData, or null if no match.
 *
 * @param {string[]} teams - [homeTeam, awayTeam] team names
 * @param {string} date - 'YYYY-MM-DD'
 * @returns {Promise<object|null>}
 */
export async function nhlcomMatchData(teams, date) {
  if (!teams || teams.length !== 2 || !date) return null;
  const wantAbbrevs = teamsToAbbrevs(teams);
  if (wantAbbrevs.size === 0) return null;
  // Try the day before, day, and day after (date might be off by a TZ)
  const d0 = new Date(date + 'T00:00:00Z');
  const dates = [date];
  for (let off = -1; off <= 1; off++) {
    const d = new Date(d0);
    d.setUTCDate(d0.getUTCDate() + off);
    dates.push(d.toISOString().slice(0, 10));
  }
  for (const d of dates) {
    try {
      const res = await fetch(`https://api-web.nhle.com/v1/schedule/${d}`, {
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) continue;
      const j = await res.json();
      for (const day of (j.gameWeek || [])) {
        for (const g of (day.games || [])) {
          const homeAbbrev = g.homeTeam?.abbrev;
          const awayAbbrev = g.awayTeam?.abbrev;
          // Both teams must match
          const homeMatch = wantAbbrevs.has(homeAbbrev);
          const awayMatch = wantAbbrevs.has(awayAbbrev);
          if (homeMatch && awayMatch) {
            const periodType = g.periodDescriptor?.periodType;
            const overTime = periodType === 'OT';
            const wasSO = periodType === 'SO';
            return {
              source: 'nhl.com',
              home: g.homeTeam?.placeName?.default + ' ' + g.homeTeam?.commonName?.default,
              away: g.awayTeam?.placeName?.default + ' ' + g.awayTeam?.commonName?.default,
              homeAbbrev,
              awayAbbrev,
              league: 'NHL',
              gameType: g.gameType, // 2=regular, 3=playoff
              gameState: g.gameState, // OFF, LIVE, FUT
              score: `${g.awayTeam?.score}-${g.homeTeam?.score}`,
              overTime: overTime ? '1-0' : '0-0',
              periodType,
              wasOT: overTime,
              wasSO,
              description: wasSO ? 'Finished after shootout'
                       : overTime ? 'Finished after over time'
                       : (periodType === 'REG' ? 'Finished' : periodType),
              winningGoalie: g.winningGoalie?.lastName?.default,
              winningGoalScorer: g.winningGoalScorer?.lastName?.default,
              venue: g.venue?.default,
              startTimeUTC: g.startTimeUTC,
              gameId: g.id,
            };
          }
          // If we get here, one or both teams don't match. If only one
          // team matches, the other might be in `wantAbbrevs` under
          // a different name. Skip — we require BOTH teams.
        }
      }
    } catch (e) {
      // Network or timeout error — try next date
      continue;
    }
  }
  return null;
}

export const nhlcomTeamsToAbbrevs = teamsToAbbrevs;
