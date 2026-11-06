#!/usr/bin/env node
// scripts/_audit-team-fk-canonical.mjs
//
// Pre-push guard (Gate 13): every team-referencing FK column must resolve
// against the canonical `team_workspaces` table, not the legacy `teams`.
//
// WHY (2026-11-06, Arnel — "this has to be a complete functionality that
// ties into rinkstop. Federations should be able to update. Coaches and
// admins should be able to manage and accept payments. Players should be
// able to manage their own passport."):
//
//   The roster, coach, player, payment and passport features each reference
//   a team by id. If some of those columns point at `teams` and others at
//   `team_workspaces`, then a team that exists only in `team_workspaces`
//   (every club a federation creates from now on, and all 13 newly
//   published India clubs) cannot be referenced by a coach, a player or a
//   payment. That is the roster blocker.
//
//   This audit fails if ANY of those FKs drifts back to the legacy table,
//   and also fails if any stored team_id stops resolving — which is the
//   symptom that would break rosters at runtime.
//
// Usage: node scripts/_audit-team-fk-canonical.mjs
// Exit: 0 = PASS, 1 = FAIL

import './load-secrets.mjs';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

/** Read a KEY=VALUE out of a file. (Same helper as _audit-rls-disabled.mjs.) */
function envFrom(file, name) {
  try {
    const txt = readFileSync(file, 'utf8');
    const m = txt.split('\n').find((l) => l.startsWith(name + '='));
    return m ? m.split('=').slice(1).join('=').trim() : null;
  } catch {
    return null;
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PROJECT_ID = 'yszheonqyyskkjoxoexk';
const PAT =
  process.env.SUPABASE_PAT ||
  envFrom('.env', 'SUPABASE_PAT') ||
  // The management PAT lives in the credential store, not in .env.
  (() => {
    try {
      const cred = JSON.parse(readFileSync('/root/.openclaw/credentials/supabase.json', 'utf8'));
      return cred.pat || null;
    } catch {
      return null;
    }
  })();

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('FAIL: missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

/**
 * Run SQL through the Supabase Management API.
 *
 * The project does NOT expose an `exec_sql` RPC over PostgREST (the schema
 * cache rejects it), and pg_constraint is not readable through PostgREST
 * either. The Management API executes as `postgres`, which is enough to
 * READ the constraint catalog — it is only a problem for REVOKE on
 * supabase_admin-owned tables, which this audit does not do.
 */
async function sql(query) {
  if (!PAT) throw new Error('Missing SUPABASE_PAT (management API token)');
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_ID}/database/query`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    },
  );
  const text = await res.text();
  if (!res.ok) throw new Error(`SQL failed (${res.status}): ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

// Every column that references a team, and the table it must reference.
const TEAM_FK_COLUMNS = [
  ['players', 'team_id'],
  ['coach_profiles', 'current_team_id'],
  ['coach_team_history', 'team_id'],
  ['coaches', 'team_id'],
  ['fixtures', 'home_team_id'],
  ['fixtures', 'away_team_id'],
  ['game_goalie_stats', 'team_id'],
  ['game_players', 'team_id'],
  ['hockey_player_team_history', 'team_id'],
  ['player_team_history', 'team_id'],
  ['membership_cards', 'team_id'],
  ['nhl_official_standings', 'team_id'],
  ['play_by_play', 'team_id'],
  ['posts', 'team_home_id'],
  ['posts', 'team_away_id'],
  ['team_aliases', 'team_id'],
  ['team_locations', 'team_id'],
  ['team_stats', 'team_id'],
  ['team_members', 'team_id'],
  ['payments', 'team_id'],
];

async function allRows(table, cols) {
  const out = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await sb
      .from(table)
      .select(cols)
      .range(offset, offset + 999);
    if (error) return null;
    const rows = data || [];
    out.push(...rows);
    if (rows.length < 1000) break;
    offset += 1000;
  }
  return out;
}

async function main() {
  const failures = [];

  // --- 1. Every team FK must point at team_workspaces -----------------------
  let fks;
  try {
    fks = await sql(`SELECT conname, conrelid::regclass::text AS tbl, confrelid::regclass::text AS refs
                     FROM pg_constraint
                     WHERE contype='f' AND confrelid IN ('public.teams'::regclass, 'public.team_workspaces'::regclass)
                     ORDER BY 1;`);
  } catch (e) {
    console.error('FAIL: could not read FK constraints:', e.message);
    process.exit(1);
  }
  const legacy = (fks || []).filter((f) => f.refs === 'teams');
  // teams.merged_into_id is a legitimate self-reference on the legacy table
  // (it records merge history for teams that do not exist in
  // team_workspaces). It is not a "team reference" in the roster sense.
  const unexpectedLegacy = legacy.filter((f) => f.conname !== 'teams_merged_into_id_fkey');
  if (unexpectedLegacy.length > 0) {
    for (const f of unexpectedLegacy) {
      failures.push(`${f.conname} on ${f.tbl} still references the legacy 'teams' table`);
    }
  }
  const canonical = (fks || []).filter((f) => f.refs === 'team_workspaces');
  console.log(`  FKs -> team_workspaces: ${canonical.length}`);
  console.log(`  FKs -> teams (legacy)  : ${legacy.length - unexpectedLegacy.length} (only teams.merged_into_id, expected)`);

  // --- 2. Every stored team id must still resolve --------------------------
  const workspaces = await allRows('team_workspaces', 'id');
  if (!workspaces) {
    console.error('FAIL: could not read team_workspaces');
    process.exit(1);
  }
  const validIds = new Set(workspaces.map((w) => w.id));
  console.log(`  canonical team_workspaces rows: ${validIds.size}`);

  for (const [table, col] of TEAM_FK_COLUMNS) {
    const rows = await allRows(table, `id, ${col}`);
    if (!rows) {
      failures.push(`${table}.${col} could not be read`);
      continue;
    }
    const withValue = rows.filter((r) => r[col]);
    if (withValue.length === 0) continue;
    const broken = withValue.filter((r) => !validIds.has(r[col]));
    if (broken.length > 0) {
      failures.push(
        `${table}.${col}: ${broken.length} of ${withValue.length} team ids do not exist in team_workspaces`,
      );
    }
  }

  // --- 3. The legacy table must keep the lifecycle columns it owns ---------
  const lifecycle = await allRows('teams', 'id, deactivated_at, merged_into_id, claimable');
  if (!lifecycle) {
    failures.push('could not read legacy teams lifecycle columns');
  } else {
    const withTw = lifecycle.filter((t) => validIds.has(t.id)).length;
    if (withTw !== lifecycle.length) {
      failures.push(
        `${lifecycle.length - withTw} legacy teams rows have no team_workspaces counterpart — ` +
          `deactivated/merged/claimable state would be lost`,
      );
    }
    const deactivated = lifecycle.filter((t) => t.deactivated_at).length;
    const merged = lifecycle.filter((t) => t.merged_into_id).length;
    console.log(
      `  legacy teams: ${lifecycle.length} rows, ${withTw} with a canonical counterpart ` +
        `(${deactivated} deactivated, ${merged} merged)`,
    );
  }

  console.log('');
  if (failures.length > 0) {
    console.error('=== TEAM FK CANONICALITY AUDIT: FAIL ===');
    for (const f of failures) console.error('  FAIL:', f);
    process.exit(1);
  }
  console.log('=== TEAM FK CANONICALITY AUDIT: PASS ===');
  console.log('  every team FK points at team_workspaces; every stored team id resolves.');
}

main().catch((e) => {
  console.error('=== TEAM FK CANONICALITY AUDIT: ERROR ===');
  console.error(e);
  process.exit(1);
});
