/**
 * Wikipedia client — free cross-check source for NHL season data.
 *
 * Each NHL season has a Wikipedia article with:
 *  - Final standings tables (with wins, losses, OT, points)
 *  - Team rosters section
 *  - Regular season schedule/results summary
 *  - Playoff bracket
 *
 * Wikipedia is not authoritative but provides an independent published
 * reference. We use it to:
 *  (a) Verify team win/loss/OT totals for the season
 *  (b) Verify roster counts per team
 *  (c) Verify total games played per team (to cross-check schedule completeness)
 *
 * Source URL pattern:
 *   https://en.wikipedia.org/wiki/2025%E2%80%9326_NHL_season
 *   https://en.wikipedia.org/wiki/2024%E2%80%9325_NHL_season
 *
 * Parsing: fetch as HTML, extract tables using regex-free parsing.
 * We target specific table structures by their heading text.
 */

const WIKIPEDIA_BASE = 'https://en.wikipedia.org/wiki';

/**
 * Build the Wikipedia article URL for a season.
 * @param {string} seasonLabel - '2025-26' or '2024-25', etc.
 */
function seasonUrl(seasonLabel) {
  // URL format: 2025%E2%80%9326_NHL_season
  const [y1, y2suffix] = seasonLabel.split('-');
  const y2 = y1.slice(0, 2) + y2suffix;
  const encoded = encodeURIComponent(`${y1}–${y1.slice(0, 2)}${y2suffix} NHL season`);
  return `${WIKIPEDIA_BASE}/${encoded}`;
}

/**
 * Parse an HTML table from Wikipedia into an array of objects.
 * Assumes th elements for headers, td elements for data.
 *
 * @param {string} html - HTML string
 * @param {string} tableHeading - The h3/h2 heading text above the target table
 * @returns {object[]} Array of row objects with column names from header row
 */
function parseTable(html, tableHeading) {
  // Extract the section containing the heading
  const headingIdx = html.indexOf(tableHeading);
  if (headingIdx === -1) return [];

  const section = html.slice(headingIdx, headingIdx + 50000);
  const tableMatch = section.match(/<table[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return [];

  const tableHtml = tableMatch[1];
  const rows = [];
  const rowMatches = tableHtml.matchAll(/<tr>([\s\S]*?)<\/tr>/gi);

  let headers = [];
  for (const rowEl of rowMatches) {
    const rowHtml = rowEl[1];
    const cells = [...rowHtml.matchAll(/<(th|td)[^>]*>([\s\S]*?)<\/\1/gi)]
      .map(m => stripTags(m[2]).trim());

    if (headers.length === 0) {
      // First row = headers
      headers = cells;
      continue;
    }
    if (cells.length === 0) continue;

    const row = {};
    headers.forEach((h, i) => { row[h] = cells[i] || ''; });
    rows.push(row);
  }
  return rows;
}

/**
 * Strip HTML tags from text.
 */
function stripTags(html) {
  return html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').trim();
}

/**
 * Fetch and parse the NHL season standings table from Wikipedia.
 *
 * @param {string} seasonLabel - '2025-26', '2024-25', etc.
 * @returns {Promise<object[]>} Array of team rows with keys: Team, GP, W, L, OTL, SOL, PTS
 */
async function fetchSeasonStandings(seasonLabel) {
  const url = seasonUrl(seasonLabel);
  console.log(`[wikipedia] fetching standings: ${url}`);
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RinkStopBot/1.0; +https://rinkstop.com/bot)' },
  });
  if (!res.ok) throw new Error(`Wikipedia ${res.status} for ${url}`);
  const html = await res.text();

  // Try multiple possible heading names for the standings table
  const headings = [
    'Regular season standings',
    ' NHL standings ',
    'Standings',
    'Regular season',
  ];
  for (const h of headings) {
    const rows = parseTable(html, h);
    if (rows.length >= 32) return rows.map(r => normalizeStandingsRow(r));
  }
  return [];
}

/**
 * Normalize a Wikipedia standings row to consistent keys.
 */
function normalizeStandingsRow(row) {
  // Wikipedia column names vary by season — map common variants
  const keys = Object.keys(row);
  const find = (...variants) => {
    for (const v of variants) {
      const k = keys.find(k => k.toLowerCase().includes(v.toLowerCase()));
      if (k) return row[k];
    }
    return '';
  };

  return {
    teamName: find('team', 'franchise', 'club'),
    gp: parseInt(find('gp', 'gp', 'games', 'played'), 10) || 0,
    wins: parseInt(find('w', 'wins', 'win'), 10) || 0,
    losses: parseInt(find('l', 'loss', 'losses'), 10) || 0,
    otl: parseInt(find('ot', 'overtime', 'sow', 'sol'), 10) || 0,
    pts: parseInt(find('pts', 'points', 'point'), 10) || 0,
    goalsFor: parseInt(find('gf', 'goals for', 'goalsfor'), 10) || 0,
    goalsAgainst: parseInt(find('ga', 'goals against', 'goalsagainst'), 10) || 0,
    // Raw keys for debugging
    _raw: row,
  };
}

/**
 * Fetch the list of NHL teams that appeared in the season from Wikipedia.
 * Used to verify all 32 teams are present in our schedule.
 *
 * @param {string} seasonLabel
 * @returns {Promise<string[]>} Array of team names found
 */
async function fetchSeasonTeams(seasonLabel) {
  const url = seasonUrl(seasonLabel);
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RinkStopBot/1.0; +https://rinkstop.com/bot)' },
  });
  if (!res.ok) return [];
  const html = await res.text();
  // Extract team names from links in the article
  const teamMatches = html.matchAll(/title="([^"]*NHL[^"]*team[^"]*|Edmonton Oilers|Boston Bruins|etc)"/gi);
  const teams = [...new Set([...teamMatches].map(m => m[1]))];
  return teams.slice(0, 50);
}

module.exports = { fetchSeasonStandings, fetchSeasonTeams, seasonUrl };
