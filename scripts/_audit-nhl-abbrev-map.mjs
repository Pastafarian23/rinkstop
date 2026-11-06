#!/usr/bin/env node
// scripts/_audit-nhl-abbrev-map.mjs
//
// 2026-11-06 (Arnel data-integrity audit)
//
// Guards the hardcoded NHL_ABBREV_TO_TEAMS_ID map in
// scripts/_daily-scores-all-leagues.cjs.
//
// Why this exists:
//   The map held a stale UUID for MTL (Montreal Canadiens). The team's row
//   had been replaced during the teams -> team_workspaces migration, so the
//   old id no longer existed in the `teams` table. EVERY NHL game involving
//   Montreal then failed with:
//
//     upsert failed: home_team_id <uuid> does not exist in teams table
//
//   The ingest kept running and reported success at the end — the errors
//   were logged per-game and then scrolled past. NHL fixtures silently
//   stopped refreshing, and with no cron running the orchestrator at all,
//   nobody noticed.
//
//   A stale UUID in a hardcoded map is invisible to `tsc` and to the build.
//   It can only be caught by checking the map against the live database.
//
// Usage: node scripts/_audit-nhl-abbrev-map.mjs
// Exit: 0 = every mapped team id resolves, 1 = at least one does not

import './load-secrets.mjs';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('FAIL: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const SOURCE = 'scripts/_daily-scores-all-leagues.cjs';

function readMap() {
  const src = readFileSync(SOURCE, 'utf8');
  const start = src.indexOf('NHL_ABBREV_TO_TEAMS_ID');
  if (start < 0) throw new Error(`NHL_ABBREV_TO_TEAMS_ID not found in ${SOURCE}`);
  const block = src.slice(start, start + 6000);
  const map = {};
  const re = /([A-Z]{2,3}):\s*'([0-9a-f-]{36})'/g;
  let m;
  while ((m = re.exec(block))) map[m[1]] = m[2];
  return map;
}

async function main() {
  const map = readMap();
  const ids = Object.values(map);
  console.log(`NHL abbrev map: ${Object.keys(map).length} entries`);

  const { data: found, error } = await sb.from('teams').select('id, name, is_active').in('id', ids);
  if (error) throw error;

  const foundById = new Map((found || []).map((t) => [t.id, t]));
  const missing = Object.entries(map).filter(([, id]) => !foundById.has(id));

  if (missing.length === 0) {
    console.log('=== NHL ABBREV MAP AUDIT: PASS ===');
    console.log(`  all ${Object.keys(map).length} mapped team ids resolve in the teams table`);
    process.exit(0);
  }

  console.error('=== NHL ABBREV MAP AUDIT: FAIL ===');
  console.error(`  ${missing.length} mapped team id(s) do not exist in the teams table:`);
  for (const [abbrev, id] of missing) {
    console.error(`    ${abbrev}  ${id}`);
    // Try to find the replacement by name so the fix is one paste, not a hunt.
    const candidates = await sb
      .from('teams')
      .select('id, name, is_active')
      .eq('is_active', true)
      .ilike('name', `%${abbrev === 'MTL' ? 'Montreal Canadiens' : abbrev}%`);
    if (candidates.data && candidates.data.length > 0) {
      for (const c of candidates.data.slice(0, 3)) {
        console.error(`      candidate: ${c.id}  ${c.name}  (active=${c.is_active})`);
      }
    } else {
      console.error(`      no active team found matching '${abbrev}' — look it up manually`);
    }
  }
  console.error('');
  console.error('  Fix: update the mapping in scripts/_daily-scores-all-leagues.cjs');
  process.exit(1);
}

main().catch((e) => {
  console.error('=== NHL ABBREV MAP AUDIT: ERROR ===');
  console.error(e);
  process.exit(1);
});
