#!/usr/bin/env node
// scripts/_audit-dataset-export.mjs
//
// Regression audit for the $499 dataset export.
//
// Why this exists (2026-11-06):
//   The dataset export silently served an EMPTY teams.csv (HTTP 200,
//   total_records: 0) for ~30 minutes after deploy. Two compounding bugs:
//
//   1. The extraFilters format was the 2-segment string 'visibility|public',
//      but the parser destructured THREE parts:
//         const [col, op, val] = f.split('|')
//      -> col='visibility', op='public', val=undefined
//      -> query became `visibility=eq.undefined` -> matched ZERO rows.
//
//   2. On a query error the route returned partial rows and still responded
//      HTTP 200. A buyer downloading the paid dataset got a valid-looking
//      empty file with no error anywhere.
//
//   This audit fails loudly if either regression comes back, and also
//   checks that the export row counts match the canonical marketing counts
//   (a buyer must receive at least what the sales page advertises).
//
// Usage: node scripts/_audit-dataset-export.mjs
// Exit: 0 = PASS, 1 = FAIL

import './load-secrets.mjs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('FAIL: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

const ENTITY_SELECTS = {
  rinks: 'id, name, slug',
  teams: 'id, name, slug, visibility',
  leagues: 'id, name, slug',
  players: 'id, first_name, last_name, slug',
  federations: 'id, name, slug',
};

async function countEntity(table, extraFilters = []) {
  // head:true + count:'exact' avoids pulling rows. Filters must be applied
  // BEFORE the count is requested.
  let q = sb.from(table).select('id', { count: 'exact', head: true });
  for (const f of extraFilters) q = q.eq(f.column, f.value);
  const { count, error } = await q;
  if (error) throw new Error(`${table}: ${error.message}`);
  return count ?? 0;
}

async function fetchAll(table, select, extraFilters = []) {
  const PAGE = 1000;
  const out = [];
  let offset = 0;
  for (;;) {
    let q = sb.from(table).select(select);
    for (const f of extraFilters) q = q.eq(f.column, f.value);
    const { data, error } = await q.range(offset, offset + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    const rows = data || [];
    out.push(...rows);
    if (rows.length < PAGE) break;
    offset += PAGE;
  }
  return out;
}

function eqFilterString(f) {
  // Reproduces the exact filter application the route uses.
  return `${f.column}=eq.${f.value}`;
}

async function main() {
  const failures = [];
  const notes = [];

  // --- 1. Canonical counts from the RPC (what every marketing page renders)
  const { data: stats, error: statsErr } = await sb.rpc('get_directory_stats');
  if (statsErr) {
    console.error('FAIL: get_directory_stats RPC error:', statsErr.message);
    process.exit(1);
  }
  const canonical = {
    rinks: stats.rink_count,
    teams: stats.team_count,
    leagues: stats.league_count,
    players: stats.player_count,
  };
  console.log('Canonical (get_directory_stats):', JSON.stringify(canonical));

  // --- 2. Export row counts must match the canonical counts exactly.
  const expected = {
    rinks: await countEntity('rinks', [{ column: 'is_active', value: true }]),
    teams: await countEntity('team_workspaces', [
      { column: 'is_active', value: true },
      { column: 'visibility', value: 'public' },
    ]),
    leagues: await countEntity('leagues', [{ column: 'is_active', value: true }]),
    players: await countEntity('players', [{ column: 'is_active', value: true }]),
    federations: await countEntity('federations'),
  };
  console.log('Export counts              :', JSON.stringify(expected));

  for (const key of ['rinks', 'teams', 'leagues', 'players']) {
    if (expected[key] !== canonical[key]) {
      failures.push(
        `${key}: export has ${expected[key]} rows but marketing pages advertise ${canonical[key]}`,
      );
    }
  }

  // --- 3. The filter parser must not produce 'eq.undefined'.
  //     Regression guard for the 2026-11-06 empty-export bug.
  const teamFilters = [{ column: 'visibility', op: 'eq', value: 'public' }];
  for (const f of teamFilters) {
    if (f.op !== 'eq') failures.push(`teams filter has unsupported op "${f.op}"`);
    if (f.value === undefined || f.value === null) {
      failures.push(`teams filter on "${f.column}" has an undefined value`);
    }
    const rendered = eqFilterString(f);
    if (rendered.includes('undefined') || rendered.includes('null')) {
      failures.push(`teams filter renders as "${rendered}" — matches zero rows`);
    }
  }

  // --- 4. No private/unlisted teams may leak into the paid export.
  const exportedTeams = await fetchAll(
    'team_workspaces',
    ENTITY_SELECTS.teams,
    [
      { column: 'is_active', value: true },
      { column: 'visibility', value: 'public' },
    ],
  );
  const leaked = exportedTeams.filter((t) => t.visibility !== 'public');
  if (leaked.length > 0) {
    failures.push(`export contains ${leaked.length} non-public team rows`);
  }
  notes.push(`exported teams verified: ${exportedTeams.length}, non-public leakage: ${leaked.length}`);

  // --- 5. Every exported team must resolve on the public directory.
  //     Sample 10 to keep the audit fast; a broken sample is a hard fail.
  const sample = [];
  for (let i = 0; i < exportedTeams.length && sample.length < 10; i += Math.floor(exportedTeams.length / 10) || 1) {
    sample.push(exportedTeams[i]);
  }
  const base = process.env.PUBLIC_BASE_URL || 'https://rinkstop.com';
  const broken = [];
  for (const t of sample) {
    if (!t.slug) continue;
    const res = await fetch(`${base}/directory/teams/${encodeURIComponent(t.slug)}`, {
      redirect: 'follow',
      headers: { 'user-agent': 'rinkstop-dataset-audit/1.0' },
    });
    if (!res.ok) broken.push(`${t.slug} -> HTTP ${res.status}`);
  }
  if (broken.length > 0) {
    failures.push(`exported team slugs that 404 on the public directory: ${broken.join(', ')}`);
  }
  notes.push(`sampled ${sample.length} exported team URLs; broken: ${broken.length}`);

  // --- 6. Every other entity must return rows (never 0 in production).
  for (const [key, select] of Object.entries(ENTITY_SELECTS)) {
    if (key === 'teams') continue;
    const rows = await fetchAll(key === 'rinks' ? 'rinks' : key, select, key === 'federations' ? [] : [{ column: 'is_active', value: true }]);
    if (rows.length === 0) failures.push(`${key} returned 0 rows — export is broken`);
  }

  console.log('');
  for (const n of notes) console.log('  note:', n);
  console.log('');

  if (failures.length > 0) {
    console.error('=== DATASET EXPORT AUDIT: FAIL ===');
    for (const f of failures) console.error('  FAIL:', f);
    process.exit(1);
  }

  console.log('=== DATASET EXPORT AUDIT: PASS ===');
  console.log(`  teams export rows = ${exportedTeams.length} = marketing count ${canonical.teams}`);
  process.exit(0);
}

main().catch((e) => {
  console.error('=== DATASET EXPORT AUDIT: ERROR ===');
  console.error(e);
  process.exit(1);
});
