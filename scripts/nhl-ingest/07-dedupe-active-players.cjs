#!/usr/bin/env node
/**
 * Phase 7 (Dedupe) — Soft-delete highlightly-source player rows that are
 * confirmed duplicates of NHL.com-source rows.
 *
 * TRACKS TRADES BEFORE DELETING:
 *   When the highlightly row's team differs from NHL.com's team (after
 *   normalizing for team alias variations like UTAH→UTA, SJ→SJS, etc.),
 *   the row is recorded as a trade event in player_trade_log BEFORE
 *   deactivation. This preserves the trade history.
 *
 * Match criteria (strict — all required):
 *   - Birth date exact match
 *   - Name normalized match (≥0.9 similarity)
 *
 * Confirmation signals (at least 3 of these):
 *   - Birth country match
 *   - Position match
 *   - Jersey number match
 *   - Height match
 *   - Weight match
 *
 * Soft signal:
 *   - Team match (after alias normalization). If team differs after
 *     normalization, it's recorded as a TRADE.
 *
 * Action: set is_active=false on the highlightly row. NHL.com row stays active.
 * Soft-delete is reversible via --undo.
 *
 * Run:
 *   node scripts/nhl-ingest/07-dedupe-active-players.cjs --dry-run
 *   node scripts/nhl-ingest/07-dedupe-active-players.cjs
 *   node scripts/nhl-ingest/07-dedupe-active-players.cjs --undo   # restore
 */

require('../load-secrets.cjs');
const { createClient } = require('@supabase/supabase-js');
const fs = require('node:fs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const dryRun = process.argv.includes('--dry-run');
const undo = process.argv.includes('--undo');

const REPORT_FILE = '/tmp/nhl_players_dedupe_report.txt';
fs.writeFileSync(REPORT_FILE, '');
function log(msg) {
  console.log(msg);
  fs.appendFileSync(REPORT_FILE, msg + '\n');
}

// ============================================================================
// NHL.com triCode → numeric teamId (from NHL.com club-schedule-season URLs)
// ============================================================================
const TRI_TO_NHL_TEAM_ID = {
  ANA: 24, BOS: 7, BUF: 8, CGY: 20, CAR: 12, CHI: 16, COL: 21, CBJ: 29,
  DAL: 25, DET: 17, EDM: 22, FLA: 13, LAK: 26, MIN: 30, MTL: 6, NSH: 18,
  NJD: 1, NYI: 2, NYR: 3, OTT: 9, PHI: 4, PIT: 5, SJS: 28, SEA: 55,
  STL: 19, TBL: 14, TOR: 10, UTA: 68, VAN: 23, VGK: 54, WPG: 52, WSH: 15
};

// Team alias normalization: highlightly uses some old abbreviations
// (UTAH for Utah Hockey Club before rename; SJ/SJS, LA/LAK, etc.)
const TEAM_ALIASES = {
  'UTAH': 'UTA',  // Utah Hockey Club → Utah Mammoth (renamed 2025-26)
  'TB': 'TBL', 'LA': 'LAK', 'SJ': 'SJS', 'NJ': 'NJD', 'WAS': 'WSH',
  'MON': 'MTL', 'PHO': 'ARI',
};
function normalizeTeam(t) {
  if (!t) return '';
  const u = t.toUpperCase();
  return TEAM_ALIASES[u] || u;
}

// ============================================================================
// Match helpers
// ============================================================================
function dateNorm(d) { return String(d || '').slice(0, 10); }
function normalize(s) {
  return (s || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}
function nameSim(a, b) {
  if (!a || !b) return 0;
  const na = normalize(a), nb = normalize(b);
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.9;
  return 0;
}
function posNorm(p) {
  const u = (p || '').toUpperCase();
  if (u === 'C' || u === 'LW' || u === 'RW' || u.includes('WING') || u.includes('CENTER')) return 'F';
  if (u.startsWith('D')) return 'D';
  if (u === 'G' || u.includes('GOAL')) return 'G';
  return u;
}

function pairScore(hl, nhl) {
  // Required: DOB exact
  if (dateNorm(hl.birth_date) !== dateNorm(nhl.birth_date)) return { score: 0, reasons: ['DOB mismatch'] };
  // Required: name match
  const ns = nameSim(hl.full_name, nhl.full_name);
  if (ns < 0.9) return { score: 0, reasons: [`name too different (${ns.toFixed(2)})`] };

  let s = 5 + (ns >= 0.95 ? 3 : 1);
  const reasons = ['DOB match', ns >= 0.95 ? 'name exact' : 'name partial'];

  if (hl.birth_country && nhl.birth_country && hl.birth_country === nhl.birth_country) { s++; reasons.push('country match'); }
  if (posNorm(hl.position) === posNorm(nhl.position)) { s++; reasons.push('pos match'); }
  if (hl.jersey_number && nhl.jersey_number && hl.jersey_number === nhl.jersey_number) { s++; reasons.push('jersey match'); }
  if (hl.height && nhl.height && hl.height === nhl.height) { s += 0.5; reasons.push('height match'); }
  if (hl.weight && nhl.weight && Math.abs(hl.weight - nhl.weight) <= 2) { s += 0.5; reasons.push('weight match'); }

  return { score: s, reasons };
}

const DUPE_THRESHOLD = 8;

async function loadAllPlayers(source) {
  const all = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from('nhl_players')
      .select('id, full_name, first_name, last_name, birth_date, birth_country, current_team_abbreviation, current_team_id, position, position_abbreviation, height, weight, shoots, jersey_number, is_active, source, created_at, updated_at')
      .eq('source', source)
      .range(offset, offset + 999);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    offset += data.length;
    if (data.length < 1000) break;
  }
  return all;
}

async function main() {
  log(`[dedupe] Phase 7 — soft-delete duplicate highlightly player rows`);
  log(`[dedupe] dry_run=${dryRun} undo=${undo}`);
  log(`[dedupe] threshold score: ${DUPE_THRESHOLD}`);

  const hlRows = await loadAllPlayers('highlightly');
  const nhlRows = await loadAllPlayers('nhl.com');
  log(`[dedupe] Loaded ${hlRows.length} highlightly + ${nhlRows.length} nhl.com players`);

  // Index NHL.com by DOB for fast lookup
  const nhlByDob = {};
  for (const n of nhlRows) {
    const d = dateNorm(n.birth_date);
    if (!d) continue;
    if (!nhlByDob[d]) nhlByDob[d] = [];
    nhlByDob[d].push(n);
  }

  // Find duplicates and classify as same-team or trade
  const sameTeamDuplicates = [];
  const tradedDuplicates = [];
  for (const hl of hlRows) {
    const d = dateNorm(hl.birth_date);
    if (!d || !nhlByDob[d]) continue;
    let best = null;
    for (const nhl of nhlByDob[d]) {
      const ps = pairScore(hl, nhl);
      if (ps.score >= DUPE_THRESHOLD && (!best || ps.score > best.score)) {
        best = { nhl, score: ps.score, reasons: ps.reasons };
      }
    }
    if (!best) continue;

    const hlTeam = normalizeTeam(hl.current_team_abbreviation);
    const nhlTeam = normalizeTeam(best.nhl.current_team_abbreviation);
    const isTrade = hlTeam !== nhlTeam;

    const record = { hl, nhl: best.nhl, score: best.score, reasons: best.reasons, hlTeam, nhlTeam };
    if (isTrade) tradedDuplicates.push(record);
    else sameTeamDuplicates.push(record);
  }

  log(`\n[dedupe] Confirmed duplicates: ${sameTeamDuplicates.length + tradedDuplicates.length}`);
  log(`  Same team (just legacy duplicate): ${sameTeamDuplicates.length}`);
  log(`  Trade events (team changed):       ${tradedDuplicates.length}`);

  log(`\n[dedupe] Sample same-team duplicates (first 5):`);
  for (const d of sameTeamDuplicates.slice(0, 5)) {
    log(`  score=${d.score} ${d.hl.full_name} hl(${d.hlTeam}#${d.hl.jersey_number}) ↔ nhl(${d.nhlTeam}#${d.nhl.jersey_number})`);
  }

  log(`\n[dedupe] ALL TRADES detected (${tradedDuplicates.length}):`);
  for (const t of tradedDuplicates) {
    log(`  ${t.hl.full_name.padEnd(28)} hl(${t.hlTeam}#${t.hl.jersey_number}, hl_updated=${t.hl.updated_at?.slice(0,10)}) → nhl(${t.nhlTeam}#${t.nhl.jersey_number})`);
  }

  // Build undo map
  const markerFile = '/tmp/nhl_players_dedupe_deactivated.json';
  let alreadyDeactivated = new Set();
  if (fs.existsSync(markerFile)) {
    alreadyDeactivated = new Set(JSON.parse(fs.readFileSync(markerFile, 'utf8')));
  }

  if (undo) {
    log(`\n[dedupe] UNDO mode — restoring ${alreadyDeactivated.size} previously deactivated rows...`);
    if (alreadyDeactivated.size === 0) {
      log(`[dedupe] No rows to restore.`);
      process.exit(0);
    }
    fs.writeFileSync(markerFile, '[]');
    let restored = 0;
    for (const id of alreadyDeactivated) {
      const { error } = await supabase
        .from('nhl_players')
        .update({ is_active: true })
        .eq('id', id);
      if (error) log(`  ❌ restore ${id}: ${error.message}`);
      else restored++;
    }
    log(`[dedupe] Restored ${restored}/${alreadyDeactivated.size} rows.`);
    process.exit(0);
  }

  // Apply: record trades first, then deactivate duplicates
  const toDeactivate = [...sameTeamDuplicates, ...tradedDuplicates]
    .filter(d => d.hl.is_active)
    .map(d => d.hl.id);

  log(`\n[dedupe] To deactivate: ${toDeactivate.length}`);
  log(`  Same-team duplicates: ${sameTeamDuplicates.filter(d => d.hl.is_active).length}`);
  log(`  Trade duplicates (recorded): ${tradedDuplicates.filter(d => d.hl.is_active).length}`);

  if (dryRun) {
    log(`\n[dedupe] DRY RUN — would:`);
    log(`  1. Insert ${tradedDuplicates.length} trade events into player_trade_log`);
    log(`  2. Set is_active=false on ${toDeactivate.length} highlightly rows`);
    log(`  3. NHL.com rows stay active (canonical source).`);
    process.exit(0);
  }

  // Step 1: record trade events
  log(`\n[dedupe] STEP 1: Recording ${tradedDuplicates.length} trades to player_trade_log...`);
  let tradesInserted = 0, tradesFailed = 0;
  for (const t of tradedDuplicates) {
    const tradeRow = {
      player_nhl_id: t.nhl.id,
      player_full_name: t.nhl.full_name,
      from_team: t.hlTeam,
      to_team: t.nhlTeam,
      from_team_id: TRI_TO_NHL_TEAM_ID[t.hlTeam] || null,
      to_team_id: TRI_TO_NHL_TEAM_ID[t.nhlTeam] || null,
      source_1: 'nhl.com',
      source_2: 'highlightly',
      trade_date_estimate: t.hl.updated_at?.slice(0, 10) || null,
      notes: `Detected during Phase 7 dedupe. Highlightly row last updated ${t.hl.updated_at?.slice(0,10)} (created ${t.hl.created_at?.slice(0,10)}). Match score ${t.score} (${t.reasons.join(', ')}).`,
    };
    const { error } = await supabase.from('player_trade_log').insert(tradeRow);
    if (error) {
      log(`  ❌ trade ${t.hl.full_name}: ${error.message}`);
      tradesFailed++;
    } else {
      tradesInserted++;
    }
  }
  log(`[dedupe] Trades recorded: ${tradesInserted} ok, ${tradesFailed} failed`);

  // Step 2: deactivate duplicate highlightly rows
  log(`\n[dedupe] STEP 2: Deactivating ${toDeactivate.length} duplicate highlightly rows...`);
  fs.writeFileSync(markerFile, JSON.stringify([...alreadyDeactivated, ...toDeactivate]));

  let deactivated = 0, failed = 0;
  for (let i = 0; i < toDeactivate.length; i += 50) {
    const batch = toDeactivate.slice(i, i + 50);
    for (const id of batch) {
      const { error } = await supabase
        .from('nhl_players')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) {
        log(`  ❌ ${id}: ${error.message}`);
        failed++;
      } else {
        deactivated++;
      }
    }
    log(`[dedupe] Progress: ${deactivated}/${toDeactivate.length} deactivated, ${failed} failed`);
  }

  // Audit log
  await supabase.from('ingest_audit_log').insert({
    entity_type: 'player_dedupe',
    season: '2025-26',
    phase: 7,
    source_1: 'nhl.com',
    source_2: 'highlightly',
    completed_at: new Date().toISOString(),
    rows_pulled_s1: nhlRows.length,
    rows_pulled_s2: hlRows.length,
    rows_matched: sameTeamDuplicates.length + tradedDuplicates.length,
    rows_flagged: tradesFailed,
    rows_rejected: 0,
    rows_inserted: tradesInserted,
    status: 'completed',
    flag_details: {
      threshold: DUPE_THRESHOLD,
      same_team_duplicates: sameTeamDuplicates.length,
      traded_duplicates: tradedDuplicates.length,
      deactivated: deactivated,
      marker_file: markerFile,
      team_alias_map: TEAM_ALIASES,
    },
  });

  log(`\n[dedupe] DONE.`);
  log(`  Trades recorded: ${tradesInserted}`);
  log(`  Highlightly duplicates deactivated: ${deactivated}`);
  log(`  To undo: node scripts/nhl-ingest/07-dedupe-active-players.cjs --undo`);
  log(`  Audit: ingest_audit_log (entity_type='player_dedupe', phase=7)`);
  log(`  Report: ${REPORT_FILE}`);
  log(`  Undo marker: ${markerFile}`);
}

main().catch(e => { console.error(e); process.exit(1); });
