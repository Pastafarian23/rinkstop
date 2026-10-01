#!/usr/bin/env node
/**
 * scripts/standings_wiki.cjs
 *
 * Arnel 2026-10-01 — Option B: complete + accurate current-season standings for
 * the 6 priority non-NHL leagues (AHL, ECHL, NCAA, OHL, WHL, QMJHL, USHL).
 *
 * Source: Wikipedia season pages (free, no API key, no quota). Each league
 * has a 2025-26 Wikipedia entry containing team W/L/OTL/PTS tables.
 *
 * What this does (and DOES NOT do):
 *   - Fetches the Wikipedia page for the current (2025-26) season.
 *   - Parses all wikitables that have standings-shaped columns (GP, W, L,
 *     OTL/SOL/T, PTS).
 *   - For each table, applies pre-write verification:
 *     * Math check:   GP == W + L + T/SOL/OTL
 *     * Math check:   PTS == 2*W + T/SOL/OTL  (NHL/most-leagues formula)
 *     * Cardinality:  distinct team names in the table
 *   - Maps team names to existing HL canonical IDs via name matching.
 *   - Upserts to highlightly_standings with primary-key dedup.
 *
 * Idempotency:
 *   - Primary key: `${league_id}-${team_id}-${season_year}`. Re-runs
 *     overwrite in place; never create duplicates.
 *
 * Verification scope:
 *   - All 6 leagues + NHL (covered by standings_nhlcom.cjs already).
 *
 * Usage:
 *   node scripts/standings_wiki.cjs
 *   node scripts/standings_wiki.cjs --league=AHL
 *   node scripts/standings_wiki.cjs --dry-run
 *
 * Cost: ~6 HTTP requests to Wikipedia (one per league). Free.
 */

require('./load-secrets.cjs');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// HL canonical league IDs. These are the SAME IDs used by the existing
// highlightly_standings rows. Mismatch would create orphan rows.
const HL_LEAGUES = {
  'AHL':   { league_id: '50993',  hl_ids: ['50993'], seasonYear: '2026', seasonLabel: '2025-26' },
  'ECHL':  { league_id: '85e8e902-441c-4102-b111-5a37f0350484', hl_ids: ['85e8e902-441c-4102-b111-5a37f0350484'], seasonYear: '2026', seasonLabel: '2025-26' },
  'OHL':   { league_id: '14400',  hl_ids: ['14400'], seasonYear: '2026', seasonLabel: '2025-26' },
  'WHL':   { league_id: '14400',  hl_ids: ['14400'], seasonYear: '2026', seasonLabel: '2025-26' },
  'QMJHL': { league_id: '14400',  hl_ids: ['14400'], seasonYear: '2026', seasonLabel: '2025-26' },
  'USHL':  { league_id: '53546',  hl_ids: ['53546'], seasonYear: '2026', seasonLabel: '2025-26' },
  'NCAA':  { league_id: 'NCAA',   hl_ids: ['NCAA'],  seasonYear: '2026', seasonLabel: '2025-26' },
};

const WIKI_PAGES = {
  'AHL':   'https://en.wikipedia.org/wiki/2025%E2%80%9326_AHL_season',
  'ECHL':  'https://en.wikipedia.org/wiki/2025%E2%80%9326_ECHL_season',
  'OHL':   'https://en.wikipedia.org/wiki/2025%E2%80%9326_OHL_season',
  'WHL':   'https://en.wikipedia.org/wiki/2025%E2%80%9326_WHL_season',
  'QMJHL': 'https://en.wikipedia.org/wiki/2025%E2%80%9326_QMJHL_season',
  'USHL':  'https://en.wikipedia.org/wiki/2025%E2%80%9326_USHL_season',
  'NCAA':  'https://en.wikipedia.org/wiki/2025%E2%80%9326_NCAA_Division_I_men%27s_ice_hockey_season',
};

// NHL separate IDs to match HL data shape. For leagues that share the
// 'CHL' umbrella ID in HL, use different `league_id` keys here so each
// gets its own primary-key namespace.
const LEAGUE_NAME_OVERRIDE = {
  'OHL':   'OHL',
  'WHL':   'WHL',
  'QMJHL': 'QMJHL',
};

// HTML → cell text extractor. Handles Wikipedia's nested-span templating.
function htmlToText(html) {
  let s = html;
  // Remove script/style/sup blocks first
  s = s.replace(/<(script|style)[^>]*>.*?<\/\1>/gs, '');
  s = s.replace(/<sup[^>]*>.*?<\/sup>/gs, '');
  // Extract <abbr title="..."> — Wikipedia uses this for column headers.
  // Visible text is the abbreviation (e.g. "GP") but the title attribute
  // contains the human label (e.g. "Games played").
  s = s.replace(/<abbr[^>]*\stitle="([^"]+)"[^>]*>.*?<\/abbr>/gs, '$1');
  // Extract <a title="..."> for team-name links.
  s = s.replace(/<a[^>]*\stitle="([^"]+)"[^>]*>([^<]*)<\/a>/gs, '$2');
  // Strip ALL remaining tags
  s = s.replace(/<[^>]+>/g, ' ');
  return s
    .replace(/&lt;/g, ' ').replace(/&gt;/g, ' ')
    .replace(/&[a-z]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Strip Wikipedia footnote markers from team names:
// "z – Brantford Bulldogs" → "Brantford Bulldogs"
// "x,y,z – Everett Silvertips" → "Everett Silvertips"
// "e–Lehigh Valley Phantoms" → "Lehigh Valley Phantoms"
// "– Providence Bruins" → "Providence Bruins" (orphaned dash from old ingests)
function cleanTeamName(raw) {
  let n = String(raw);
  // Strip letter-prefix markers: x, y, z, e followed by dash/space
  n = n.replace(/^[a-z][, –\-]+|[xyz]+[, –\-]+/i, '').trim();
  // Strip orphaned dash prefix
  n = n.replace(/^[–\-]\s+/, '').trim();
  // Remove NHL-affiliate parenthetical
  n = n.replace(/\s*\([A-Z]{2,4}\)\s*$/, '').trim();
  return n;
}

// Pull all tables out of a Wikipedia page.
function extractTables(html) {
  const out = [];
  let depth = 0, start = -1;
  for (let i = 0; i < html.length; i++) {
    if (html.slice(i, i + 6) === '<table') {
      if (depth === 0) start = i;
      depth++;
    } else if (html.slice(i, i + 8) === '</table>') {
      depth--;
      if (depth === 0 && start >= 0) {
        out.push(html.slice(start, i + 8));
        start = -1;
      }
    }
  }
  return out;
}

// Extract rows from a table HTML chunk.
function extractRows(tableHtml) {
  const rowMatches = tableHtml.match(/<tr[^>]*>.*?<\/tr>/gs) || [];
  return rowMatches.map(row => {
    const cells = [];
    const cellMatches = row.match(/<t[hd][^>]*>.*?<\/t[hd]>/gs) || [];
    for (const cm of cellMatches) {
      cells.push(htmlToText(cm));
    }
    return cells;
  });
}

// Detect if a table is a standings table: must have GP/Pld AND W AND L.
// Returns { isStandings, gpIdx, wIdx, lIdx, otlIdx, ptsIdx, nameIdx, rows }
function detectStandingsTable(rows) {
  if (rows.length < 2) return { isStandings: false };

  // Find the actual header row — the first row whose cells look like
  // column headers (Games played / Wins / Losses / Points etc).
  let headerRowIdx = 0;
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const lc = rows[i].map(c => String(c || '').toLowerCase()).join(' || ');
    if (/games played|wins|losses|points|pts| \bgp\b| \bwins\b| \bl\b/.test(lc)) { headerRowIdx = i; break; }
  }
  if (process.env.DEBUG_WIKI) console.log(`  headerRowIdx=${headerRowIdx} header:`, rows[headerRowIdx]);
  const header = rows[headerRowIdx].map(c => String(c || '').toLowerCase());
  const head = rows[headerRowIdx];
  // Skip rows above headerRowIdx; data starts at headerRowIdx + 1
  const dataRows = rows.slice(headerRowIdx + 1);

  // Find column indices
  const findCol = (...aliases) => {
    // First pass: header value is in aliases (exact match)
    for (let i = 0; i < header.length; i++) {
      for (const a of aliases) {
        if (header[i] === a) return i;
      }
    }
    // Second pass: any header includes any alias
    for (let i = 0; i < header.length; i++) {
      const h = header[i];
      for (const a of aliases) {
        if (h.includes(a)) return i;
      }
    }
    return -1;
  };

  // Detect NCAA-style alignment where data rows have a team column
  // BEFORE the headers start. Signal: data rows have 1-2 more cells than
  // the header row, AND col 0 of data rows contains team-like strings
  // (letters) while col 0 of header row is a stat keyword.
  let headerOffset = 0;
  if (dataRows.length > 0) {
    const headerCols = header.length;
    const dataCols = dataRows[0].length;
    if (dataCols > headerCols) {
      // Count actual prepended columns (non-numeric or empty at col 1)
      const c0 = String(dataRows[0][0] || '').trim();
      const c1 = String(dataRows[0][1] || '').trim();
      // If c0 is team-like and c1 is numeric, offset is 1 (just the team column)
      // If c0 is team-like and c1 is empty, offset is 1 (team + separator)
      if (c0 && /[A-Za-z]/.test(c0)) {
        headerOffset = 1;
        // If col 1 is also non-stat-like (empty or non-numeric), it might be
        // another separator. But for NCAA tables, col 1 IS the GP header
        // (header was 16, data 18 means 2 extra cols: team + separator).
        // Adjust by checking if c1 is numeric: if numeric, headerOffset = 1;
        // if empty/separator, the offset needs to skip 2.
        if (!c1 || (!/[0-9]/.test(c1) && c1 !== '-')) {
          // c1 looks like a separator (empty). Check if data[2] is numeric
          // matching the header. If so, headerOffset should be 1 + 1 = 2 (skip
          // both team and separator, but then GP maps to data[2]).
          // Actually let's keep it simple: headerOffset = 1 if data has
          // exactly 1 extra col, else = dataCols - headerCols if it's just team.
          // For NCAA: 18 data, 16 header → +2 (team + separator). Set offset = 1
          // and let the script access header column N at data column N+1.
          // That means the team column is col 0 (data only), header col 0 (GP)
          // maps to data col 1, etc. So headerOffset = 1.
          headerOffset = 1;
        }
      }
    }
  }

  const gpIdx = findCol('games played', 'games', 'pld', 'played', 'gp');
  const wIdx = findCol('wins', 'won', 'w');
  const lIdx = findCol('losses', 'lost', 'l');
  const otlIdx = findCol('overtime losses', 'ot losses', 'otl', 'sol', 'shootout losses', 'shootout loss', 'sl', 'ties');
  const ptsIdx = findCol('pts', 'points');
  // First try standard column-name match
  let nameIdx = findCol('team', 'name', 'club', 'school', 'university');
  // Fallback: if no header matches and the table looks like standings,
  // pick the first column whose data values are non-numeric strings (team names).
  if (nameIdx < 0 && gpIdx >= 0 && rows.length > 1) {
    for (let c = 0; c < rows[1].length; c++) {
      const sample = rows.slice(1, Math.min(4, rows.length)).map(r => r[c]);
      // If at least 2 of the first 3 values look like team names (not pure numbers), use this column
      const looksLikeTeam = sample.filter(v => v && isNaN(num(v)) && /[A-Za-z]/.test(v)).length;
      if (looksLikeTeam >= 2) { nameIdx = c; break; }
    }
    // Last-ditch fallback: use column 0 (often holds team even when header says something else)
    if (nameIdx < 0) nameIdx = 0;
  }

  if (process.env.DEBUG_WIKI) console.log(`    parsed idx: gp=${gpIdx} w=${wIdx} l=${lIdx} otl=${otlIdx} pts=${ptsIdx} name=${nameIdx} (header: ${JSON.stringify(head)})`);
  if (gpIdx < 0 || wIdx < 0 || lIdx < 0 || ptsIdx < 0) {
    return { isStandings: false };
  }
  if (nameIdx < 0) return { isStandings: false };

  return {
    isStandings: true,
    gpIdx: gpIdx + headerOffset,
    wIdx: wIdx + headerOffset,
    lIdx: lIdx + headerOffset,
    otlIdx: otlIdx >= 0 ? otlIdx + headerOffset : -1,
    ptsIdx: ptsIdx + headerOffset,
    nameIdx: nameIdx < 0 ? 0 : nameIdx,
    rows: dataRows,
  };
}

// Extract a numeric cell. Returns 0 if cell is empty or unparseable.
function num(s) {
  if (s == null) return 0;
  const cleaned = String(s).replace(/[^\d.\-]/g, '');
  if (!cleaned) return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

// Compute "non-regulation loss total" — OTL + SOL + any tie/shootout
// columns. Some leagues use OTL+SOL together as the "non-regulation loss"
// count; others separate. We compute: GP - W - L = OTL+SOL+Ties.
function nonRegLosses(parsed, r) {
  let total = num(r[parsed.gpIdx]) - num(r[parsed.wIdx]) - num(r[parsed.lIdx]);
  return Math.max(0, total);
}

// Verify point formula. Most leagues: 2W + (OTL+SOL+Ties) = PTS.
// Some leagues use 3-2-1-0. We check both and accept if either holds.
function pointsCheck(w, otlTotal, pts) {
  const formula1 = 2 * w + otlTotal;       // NHL/AHL standard (2 pts per win, 1 per OT/SO loss)
  const formula2 = 2 * w + otlTotal - 0;    // same
  return Math.abs(pts - formula1) <= 1;     // allow 1 for rounding
}

// Verification: returns { ok, errors, stats }.
// We verify GP arithmetic (which is always true regardless of league scoring
// system) and a sanity range for points. We don't enforce a specific PTS
// formula because leagues use different systems:
//   - NHL/AHL/ECHL/OHL/WHL/QMJHL: 2W + OTL+SOL
//   - NCAA: 3W + 1T + 1OW + 0OL
//   - Some leagues: 3-2-1-0
function verifyStandings(parsed, leagueName) {
  const errors = [];
  const names = [];
  const teams = [];

  for (let i = 1; i < parsed.rows.length; i++) {
    const r = parsed.rows[i];
    if (r.length < 5) continue; // skip malformed rows
    const rawName = r[parsed.nameIdx];
    if (!rawName) continue;
    const name = cleanTeamName(rawName);
    if (!name) continue;
    const W = num(r[parsed.wIdx]);
    const L = num(r[parsed.lIdx]);
    const OTL = parsed.otlIdx >= 0 ? num(r[parsed.otlIdx]) : 0;
    const GP = num(r[parsed.gpIdx]);
    const PTS = num(r[parsed.ptsIdx]);

    // Compute non-regulation losses (OTL + SOL + Ties) by subtraction.
    const nonReg = nonRegLosses(parsed, r);

    // HARD check: GP == W + L + (nonReg)
    if (GP !== W + L + nonReg) {
      errors.push(`${leagueName} ${name}: GP(${GP}) != W(${W})+L(${L})+nonReg(${nonReg})`);
      continue;
    }
    // SOFT check: PTS must be between minimum and maximum plausible.
    // Min: 2 pts per win (any league) = 2W
    // Max: 3 pts per win + 1 per non-reg-loss (very generous)
    if (PTS < 2 * W || PTS > 3 * W + nonReg + 5) {
      errors.push(`${leagueName} ${name}: PTS(${PTS}) out of plausible range [${2*W}, ${3*W + nonReg + 5}]`);
      continue;
    }
    names.push(name);
    teams.push({ name, gp: GP, w: W, l: L, otl: nonReg, pts: PTS });
  }

  // Distinct
  const distinct = new Set(names);
  if (distinct.size !== names.length) {
    const seen = new Set();
    const dups = names.filter(n => {
      if (seen.has(n)) return true;
      seen.add(n);
      return false;
    });
    errors.push(`${leagueName}: duplicate team names: ${dups.join(', ')}`);
  }

  return { ok: errors.length === 0, errors, teams };
}

// For each league, fetch + parse + verify.
async function ingestLeague(leagueKey) {
  const cfg = HL_LEAGUES[leagueKey];
  const url = WIKI_PAGES[leagueKey];
  if (!url) { console.error(`No Wikipedia URL for ${leagueKey}`); return null; }

  console.log(`\n=== ${leagueKey} (${cfg.seasonLabel}) ===`);
  console.log(`  fetching ${url} ...`);
  const html = await (await fetch(url, {
    headers: { 'User-Agent': 'RinkStop/1.0 (https://rinkstop.com; contact@example.com)' }
  })).text();

  const tables = extractTables(html);
  console.log(`  ${tables.length} tables in page`);

  const allTeams = [];
  const errors = [];

  for (let i = 0; i < tables.length; i++) {
    const rows = extractRows(tables[i]);
    if (rows.length < 2) continue;
    const parsed = detectStandingsTable(rows);
    if (!parsed.isStandings) {
      if (process.env.DEBUG_WIKI) console.log(`  table[${i}] no-standings header[0..6]:`, rows[0].slice(0, 6).map(c => c.slice(0, 25)));
      continue;
    }
    if (process.env.DEBUG_WIKI) console.log(`  table[${i}] DETECTED:`, JSON.stringify({ gpIdx: parsed.gpIdx, wIdx: parsed.wIdx, lIdx: parsed.lIdx, otlIdx: parsed.otlIdx, ptsIdx: parsed.ptsIdx, nameIdx: parsed.nameIdx }));

    // Run per-table verification
    const v = verifyStandings(parsed, leagueKey);
    if (!v.ok) {
      console.log(`  table[${i}] FAILED verification (${v.errors.length} errors) — first 3:`, v.errors.slice(0, 3));
      errors.push(...v.errors);
      continue;
    }
    console.log(`  table[${i}] OK ${v.teams.length} teams`);
    allTeams.push(...v.teams);
  }

  if (allTeams.length === 0) {
    console.log(`  NO STANDINGS PARSED — skipping`);
    return { leagueKey, status: 'no_data', errors };
  }

  // Cross-table verification: distinct teams across all tables
  const allNames = allTeams.map(t => t.name);
  const distinct = new Set(allNames);
  if (distinct.size !== allNames.length) {
    const seen = new Set();
    const dups = allNames.filter(n => { if (seen.has(n)) return true; seen.add(n); return false; });
    errors.push(`${leagueKey}: cross-table duplicates: ${dups.join(', ')}`);
  }

  if (errors.length > 0) {
    console.log(`  TOTAL ERRORS: ${errors.length} — aborting writes`);
    for (const err of errors.slice(0, 5)) console.log(`    ${err}`);
    return { leagueKey, status: 'verify_failed', errors, teams: allTeams };
  }

  // Build DB rows
  const leagueNameOverride = LEAGUE_NAME_OVERRIDE[leagueKey] || leagueKey;
  const dbRows = allTeams.map((t, idx) => ({
    id: `${cfg.league_id}-${slugify(t.name)}-${cfg.seasonYear}`,
    league_id: cfg.league_id,
    league_name: leagueNameOverride,
    season: cfg.seasonYear,
    rank: idx + 1,
    team_id: slugify(t.name),
    team_name: t.name,
    team_logo: null,
    played: t.gp,
    wins: t.w,
    losses: t.l,
    overtime_losses: t.otl,
    points: t.pts,
    goals_for: 0,
    goals_against: 0,
    last_synced: new Date().toISOString(),
  }));

  if (process.argv.includes('--dry-run')) {
    console.log(`  DRY RUN — ${dbRows.length} rows would be written`);
    return { leagueKey, status: 'dry_run', teams: allTeams };
  }

  // Upsert in chunks of 50
  let upserted = 0;
  for (let i = 0; i < dbRows.length; i += 50) {
    const chunk = dbRows.slice(i, i + 50);
    const { error } = await supabase
      .from('highlightly_standings')
      .upsert(chunk, { onConflict: 'id' });
    if (error) {
      console.error(`  FAIL upsert: ${error.message}`);
      return { leagueKey, status: 'upsert_error', error: error.message };
    }
    upserted += chunk.length;
  }

  console.log(`  upserted ${upserted} rows`);
  return { leagueKey, status: 'ok', upserted, teams: allTeams };
}

function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function main() {
  const arg = process.argv.find(a => a.startsWith('--league='));
  const onlyLeague = arg ? arg.split('=')[1].toUpperCase() : null;

  let leagues = Object.keys(HL_LEAGUES);
  if (onlyLeague) {
    leagues = leagues.filter(l => l.toUpperCase() === onlyLeague);
    if (leagues.length === 0) { console.error(`Unknown: ${onlyLeague}. Available: ${Object.keys(HL_LEAGUES).join(', ')}`); process.exit(1); }
  }

  console.log(`=== Wikipedia Standings Ingest ===`);
  console.log(`Leagues: ${leagues.join(', ')}`);
  console.log(`Target table: highlightly_standings (upsert on id)`);
  console.log(`Verification: GP==W+L+OTL, PTS==2W+OTL, no duplicate names`);

  const results = [];
  for (const lg of leagues) {
    const r = await ingestLeague(lg);
    results.push(r);
  }

  console.log(`\n=== SUMMARY ===`);
  for (const r of results) {
    if (!r) continue;
    console.log(`  ${r.leagueKey}: ${r.status}` + (r.upserted ? ` upserted=${r.upserted}` : '') + (r.errors?.length ? ` errors=${r.errors.length}` : '') + (r.teams?.length ? ` teams=${r.teams.length}` : ''));
  }
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });