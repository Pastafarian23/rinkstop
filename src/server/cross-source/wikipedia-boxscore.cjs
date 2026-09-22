// _wikipedia-boxscore.cjs — 2026-09-22
//
// Cross-source verification via Wikipedia season/tournament pages.
//
// Scope: IIHF events (Olympics, World Championship U18/U20/IIHF),
// Stanley Cup Final + playoff rounds, Olympic qualifiers. Wikipedia
// season pages for NHL/KHL/SHL/DEL/Liiga do NOT have game-by-game
// results tables (only standings + player stats), so they're out of
// scope here.
//
// Per Arnel 2026-09-22 00:48 CDT: 'For Wikipedia, it's good as an
// extra source, but I'm concerned about any potential issues with
// accuracy.' Strict protocol: Wikipedia match alone = PASS_WIKI
// (held as draft with editorial review flag), not auto-published.
//
// Format examples:
//   IIHF World Championship (2024 IIHF World Championship):
//     |10 May 2024
//     |- style=font-size:90%
//     ||align=right|{{ih-rt|SUI}}|| ||align=center|[[...|5–2]]|| ||{{ih|NOR}}||
//
//   Stanley Cup Final (2024 Stanley Cup Final):
//     Uses scoring summary tables. Final score at end of last row.
//
// Cache key: (page slug, section/table index). 7-day TTL — Wikipedia
// season tables are stable post-game.

const path = require('node:path');
const fs = require('node:fs');

// 7-day TTL per (page, tableIndex). Caches live in /tmp like the
// other scripts.
const CACHE_DIR = '/tmp';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function cacheKey(pageSlug, tableIdx) {
  return `wikipedia_${pageSlug.replace(/[^a-z0-9_-]/gi, '_')}_t${tableIdx}.json`;
}

function cacheGet(pageSlug, tableIdx) {
  try {
    const fp = path.join(CACHE_DIR, cacheKey(pageSlug, tableIdx));
    const raw = fs.readFileSync(fp, 'utf8');
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.cachedAt > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function cacheSet(pageSlug, tableIdx, data) {
  try {
    const fp = path.join(CACHE_DIR, cacheKey(pageSlug, tableIdx));
    fs.writeFileSync(fp, JSON.stringify({ cachedAt: Date.now(), ...data }, null, 2));
  } catch {}
}

// Score pattern: "5–2", "5-2", "1–0 (GWS)", "4–5 (OT)", "3–2 (SO)"
// Allow en-dash, em-dash, or hyphen between scores.
const SCORE_RE = /(\d+)\s*[-–—]\s*(\d+)(?:\s*\((OT|GWS|GWSO|SO|OTW)\))?/i;

// Date pattern: "10 May 2024" or "May 10, 2024"
const DATE_RE = /\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept|Oct|Nov|Dec)\w*\s+(\d{4})\b/i;

const MONTH_TO_NUM = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sept: 9, sep: 9, oct: 10, nov: 11, dec: 12,
};

function isoDate(match) {
  const day = parseInt(match[1], 10);
  const month = MONTH_TO_NUM[match[2].toLowerCase().slice(0, 4)];
  const year = parseInt(match[3], 10);
  if (!month) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// Fetch + parse a Wikipedia page, returning the wikitext body and
// the table block by index.
async function fetchWikipediaPage(pageSlug) {
  const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(pageSlug)}&format=json&prop=wikitext`;
  const r = await fetch(url, { headers: { 'User-Agent': 'RinkStop-Bot/1.0' } });
  if (!r.ok) return null;
  const j = await r.json();
  if (j.error) return null;
  return j.parse?.wikitext?.['*'] || '';
}

// Parse all tables from a wikitext string. Returns array of {index,
// body, headers}.
function parseAllTables(wikitext) {
  const tables = [];
  const tableRe = /\{\|([\s\S]*?)\|\}/g;
  let m;
  while ((m = tableRe.exec(wikitext)) !== null) {
    const body = m[1];
    tables.push({
      index: tables.length,
      body,
      // 2026-09-22 audit fix (bug #11): drop the /\[\[/m requirement.
      // IIHF tables use {{ih-rt|XXX}} which doesn't have [[wiki-links]],
      // so hasGameRows was rejecting every actual IIHF table. Now any
      // table with a numeric score pattern is considered.
      hasGameRows: SCORE_RE.test(body),
    });
  }
  return tables;
}

// 2026-09-22 audit fix (bug #11): added Stanley Cup Final-style parser.
// Stanley Cup Final Wikipedia tables use plain [[Team]] wiki-links
// instead of {{ih-rt|XXX}} markers, with the score in the middle of
// the row. Returns the same {visitor, home, date, scoreA, scoreB,
// ot_so} shape as parseIihfTableRows.
function parseStanleyCupRows(tableBody) {
  const rows = [];
  const lines = tableBody.split('\n');
  let currentDate = null;
  // Stanley Cup Final row format example:
  //   |Game 1||May 30|| [[Boston Bruins]] || 4–1 || [[St. Louis Blues]] || ...
  //   |Game 2||June 1|| [[St. Louis Blues]] || 3–2 (OT) || [[Boston Bruins]] || ...
  // Capture: link1 + score + link2 (direction-agnostic).
  const SC_LINK_RE = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\][^|]*?(\d+\s*[-–—]\s*\d+(?:\s*\((OT|GWS|GWSO|SO|OTW)\))?)[^|]*?\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/i;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    // Date-only row like "|May 30" or "|June 1, 2024"
    const dm = line.match(DATE_RE);
    if (dm && !line.includes('||')) {
      currentDate = isoDate(dm);
      continue;
    }
    if (!line.startsWith('|')) continue;
    const m = line.match(SC_LINK_RE);
    if (!m) continue;
    const visitor = m[1].trim();
    const scoreStr = m[2];
    const home = m[4].trim();
    const scoreMatch = scoreStr.match(SCORE_RE);
    if (!scoreMatch) continue;
    const scoreA = parseInt(scoreMatch[1], 10);
    const scoreB = parseInt(scoreMatch[2], 10);
    const otSo = scoreMatch[3] ? scoreMatch[3].toUpperCase() : null;
    if (Number.isNaN(scoreA) || Number.isNaN(scoreB)) continue;
    rows.push({ date: currentDate, visitor, home, scoreA, scoreB, ot_so: otSo });
  }
  return rows;
}

// Parse game rows from an IIHF-style table. Returns array of
// {visitor, home, date, scoreA, scoreB, ot_so} or empty.
function parseIihfTableRows(tableBody) {
  const rows = [];
  const lines = tableBody.split('\n');
  let currentDate = null;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    // Date-only row like "|10 May 2024"
    const dm = line.match(DATE_RE);
    if (dm && !line.includes('||')) {
      currentDate = isoDate(dm);
      continue;
    }
    // Game row: |align=right|{{ih-rt|XXX}}|| ... |align=center|5–2| ... ||{{ih|YYY}}||
    if (!line.startsWith('|')) continue;
    const scoreMatch = line.match(SCORE_RE);
    if (!scoreMatch) continue;
    // Extract visitor from {{ih-rt|XXX}} and home from {{ih|YYY}}.
    const visitMatch = line.match(/\{\{ih-rt\|([^}|]+)/);
    const homeMatch = line.match(/\{\{ih\|([^}|]+)/);
    if (!visitMatch || !homeMatch) continue;
    const visitor = visitMatch[1].trim();
    const home = homeMatch[1].trim();
    const scoreA = parseInt(scoreMatch[1], 10);
    const scoreB = parseInt(scoreMatch[2], 10);
    const otSo = scoreMatch[3] ? scoreMatch[3].toUpperCase() : null;
    if (Number.isNaN(scoreA) || Number.isNaN(scoreB)) continue;
    rows.push({
      date: currentDate,
      visitor,
      home,
      scoreA,
      scoreB,
      ot_so: otSo,
    });
  }
  return rows;
}

// IIHF country code → human name. From scripts/reseed-iihf-wiki.mjs.
const IIHF_COUNTRY = {
  CAN: 'Canada', USA: 'United States', SWE: 'Sweden', FIN: 'Finland',
  RUS: 'Russia', CZE: 'Czechia', SVK: 'Slovakia', GER: 'Germany',
  SUI: 'Switzerland', DEN: 'Denmark', NOR: 'Norway', FRA: 'France',
  AUT: 'Austria', LAT: 'Latvia', BLR: 'Belarus', SLO: 'Slovenia',
  ITA: 'Italy', KAZ: 'Kazakhstan', GBR: 'Great Britain', POL: 'Poland',
  HUN: 'Hungary', JPN: 'Japan', CHN: 'China', KOR: 'South Korea',
  TPE: 'Chinese Taipei', UKR: 'Ukraine', EST: 'Estonia',
  ESP: 'Spain', NED: 'Netherlands', LTU: 'Lithuania', CRO: 'Croatia',
  ROM: 'Romania', BIH: 'Bosnia and Herzegovina', BEL: 'Belgium',
  BUL: 'Bulgaria', SRB: 'Serbia', MEX: 'Mexico', ISR: 'Israel',
  AUS: 'Australia', NZL: 'New Zealand', ARG: 'Argentina',
  COL: 'Colombia', BRA: 'Brazil', RSA: 'South Africa',
};

function normalizeCountry(token) {
  return IIHF_COUNTRY[token.toUpperCase()] || token;
}

// Find a game in the parsed rows. dateIso is YYYY-MM-DD. visitor/home
// can be country names or aliases. Match direction-agnostic.
function findGame(rows, dateIso, visitorHint, homeHint) {
  if (!dateIso) return null;
  const vNorm = normalizeCountry(visitorHint).toLowerCase().split(/\s+/).slice(-1)[0]; // last word
  const hNorm = normalizeCountry(homeHint).toLowerCase().split(/\s+/).slice(-1)[0];
  for (const row of rows) {
    if (row.date !== dateIso) continue;
    const visitorWord = normalizeCountry(row.visitor).toLowerCase().split(/\s+/).slice(-1)[0];
    const homeWord = normalizeCountry(row.home).toLowerCase().split(/\s+/).slice(-1)[0];
    const direct = (visitorWord === vNorm && homeWord === hNorm);
    const reverse = (visitorWord === hNorm && homeWord === vNorm);
    if (direct || reverse) {
      if (reverse) {
        return {
          date: row.date,
          visitor: row.home,
          home: row.visitor,
          visitorScore: row.scoreB,
          homeScore: row.scoreA,
          otSo: row.ot_so,
        };
      }
      return {
        date: row.date,
        visitor: row.visitor,
        home: row.home,
        visitorScore: row.scoreA,
        homeScore: row.scoreB,
        otSo: row.ot_so,
      };
    }
  }
  return null;
}

// Public entry point.
async function lookupWikipediaBoxscore({ pageSlug, dateIso, visitorHint, homeHint }) {
  const cached = cacheGet(pageSlug, 0);
  let wikitext;
  if (cached) {
    wikitext = cached.wikitext;
  } else {
    wikitext = await fetchWikipediaPage(pageSlug);
    if (!wikitext) return null;
    cacheSet(pageSlug, 0, { wikitext });
  }
  const parsed = parseAllTables(wikitext);
  // Try IIHF-style tables first, then Stanley Cup Final-style tables.
  // Each parser produces {visitor, home, scoreA, scoreB, ot_so} rows.
  for (const t of parsed) {
    if (!t.hasGameRows) continue;
    // Try IIHF first
    let rows = parseIihfTableRows(t.body);
    let parser = 'iihf';
    if (rows.length === 0) {
      rows = parseStanleyCupRows(t.body);
      parser = 'stanley-cup';
    }
    if (rows.length === 0) continue;
    const match = findGame(rows, dateIso, visitorHint, homeHint);
    if (match) {
      return {
        source: 'wikipedia',
        pageSlug,
        tableIndex: t.index,
        parser,
        ...match,
      };
    }
  }
  return null;
}

module.exports = { lookupWikipediaBoxscore, parseIihfTableRows, parseAllTables, findGame };

// CLI: node src/server/cross-source/wikipedia-boxscore.cjs --page="2024 IIHF World Championship" --date=2024-05-10 --visitor=Switzerland --home=Norway
if (require.main === module) {
  const args = process.argv.slice(2);
  function getArg(name) {
    const a = args.find(x => x.startsWith(`--${name}=`));
    return a ? a.split('=').slice(1).join('=') : null;
  }
  const pageSlug = getArg('page');
  const dateIso = getArg('date');
  const visitorHint = getArg('visitor');
  const homeHint = getArg('home');
  if (!pageSlug || !dateIso || !visitorHint || !homeHint) {
    console.error('Usage: --page=<slug> --date=YYYY-MM-DD --visitor=<name> --home=<name>');
    process.exit(1);
  }
  lookupWikipediaBoxscore({ pageSlug, dateIso, visitorHint, homeHint }).then(r => {
    console.log(JSON.stringify(r, null, 2));
  });
}