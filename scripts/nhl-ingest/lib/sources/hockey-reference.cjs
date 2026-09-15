/**
 * Hockey-Reference.com client — free cross-check source.
 *
 * URL pattern:
 *   https://www.hockey-reference.com/leagues/NHL/2026.html  (regular season stats)
 *   https://www.hockey-reference.com/leagues/NHL/2026_games.html  (game results)
 *   https://www.hockey-reference.com/leagues/NHL/2026_scoring.html (scoring stats)
 *
 * Used to cross-check:
 *  - Team standings totals (wins, losses, OT, points)
 *  - Individual player stats
 *  - Game results + scores
 *
 * Note: hockey-reference URL format uses single year (2026 = 2025-26 season).
 */

const HR_BASE = 'https://www.hockey-reference.com/leagues';

/**
 * Map our season label to hockey-reference URL year.
 * 2025-26 → 2026 (the year the regular season ENDS)
 * 2024-25 → 2025
 */
function seasonLabelToHrYear(seasonLabel) {
  const m = seasonLabel.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  return parseInt(m[1], 10) + 1;
}

/**
 * Fetch team standings from hockey-reference.
 *
 * @param {string} seasonLabel - '2025-26'
 * @returns {Promise<object[]>} Array of team rows
 */
async function fetchHrTeamStandings(seasonLabel) {
  const year = seasonLabelToHrYear(seasonLabel);
  const url = `${HR_BASE}/NHL/${year}.html`;
  console.log(`[hockey-ref] fetching standings: ${url}`);
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RinkStopBot/1.0; +https://rinkstop.com/bot)' },
  });
  if (!res.ok) {
    console.warn(`[hockey-ref] ${res.status} for ${url}`);
    return [];
  }
  const html = await res.text();

  // Parse the standings table — it's the first <table> in the page
  return parseStandingsTable(html);
}

/**
 * Fetch game results from hockey-reference.
 *
 * @param {string} seasonLabel - '2025-26'
 * @returns {Promise<object[]>} Array of game rows: { date, visitor, home, v_score, h_score, ot, so }
 */
async function fetchHrGameResults(seasonLabel) {
  const year = seasonLabelToHrYear(seasonLabel);
  const url = `${HR_BASE}/NHL/${year}_games.html`;
  console.log(`[hockey-ref] fetching game results: ${url}`);
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RinkStopBot/1.0; +https://rinkstop.com/bot)' },
  });
  if (!res.ok) {
    console.warn(`[hockey-ref] ${res.status} for ${url}`);
    return [];
  }
  const html = await res.text();
  return parseGameResultsTable(html);
}

// ---------------------------------------------------------------------------
// HTML parsing utilities
// ---------------------------------------------------------------------------

function parseStandingsTable(html) {
  // Extract all tables and find the one with team names + W/L/OT/PTS
  const tableMatches = html.matchAll(/<table[^>]*class="[^"]*sortable[^"]*"[^>]*>([\s\S]*?)<\/table>/gi);
  for (const match of tableMatches) {
    const rows = parseHtmlTable(match[1]);
    // A valid NHL standings table has columns like: Team, GP, W, L, OTL, PTS
    if (rows.length >= 32) {
      const headers = Object.keys(rows[0]);
      const hasPts = headers.some(h => h.toLowerCase().includes('pts') || h.includes('PTS'));
      const hasW = headers.some(h => h === 'W' || h === 'Wins');
      if (hasPts && hasW) return rows;
    }
  }
  return [];
}

function parseGameResultsTable(html) {
  // hockey-reference game results table
  const tableMatch = html.match(/<table[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return [];
  const rows = parseHtmlTable(tableMatch[1]);
  return rows.map(r => ({
    date: r.Date || r.date || '',
    visitor: r.Visitor || r.visitor || '',
    home: r.Home || r.home || '',
    v_score: parseInt(String(rvisitor = r['visitor_score'] || '').replace(/\D/g, '') || '0', 10),
    h_score: parseInt(String(r.home_score || '').replace(/\D/g, '') || '0', 10),
    ot: !!(r.OT || r.OT || r['OT/SO']),
    so: !!(r.SO || r['OT/SO']),
    nhl_game_id: extractHrGameId(r),
  }));
}

function extractHrGameId(row) {
  // hockey-reference includes an anchor per game row
  // Format: /boxscores/202604150ANA.html
  const raw = JSON.stringify(row);
  const m = raw.match(/20\d{12}[A-Z]{3}\.html/);
  return m ? m[0].replace('.html', '').replace(/^20/, '') : null;
}

function parseHtmlTable(tableHtml) {
  const rows = [];
  const rowMatches = tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
  let headers = [];

  for (const rowEl of rowMatches) {
    const cells = [...rowEl[1].matchAll(/<(th|td)[^>]*?(data-stat="([^"]*)")?[^>]*>([\s\S]*?)<\/\1/gi)]
      .map(m => ({
        value: stripTags(m[4]),
        stat: m[3] || '',
      }));

    if (cells.length === 0) continue;

    // Check if this is a header row (th elements)
    const isHeader = rowEl[1].includes('<th ');
    if (isHeader) {
      headers = cells.map(c => c.stat || c.value);
      continue;
    }

    const row = {};
    cells.forEach((c, i) => {
      const key = headers[i] || `col_${i}`;
      row[key] = c.value;
    });
    rows.push(row);
  }
  return rows;
}

function stripTags(html) {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#215;/g, '×')
    .trim();
}

module.exports = { fetchHrTeamStandings, fetchHrGameResults, seasonLabelToHrYear };
