#!/usr/bin/env node
/**
 * scripts/verify-nhl-coaching-import.mjs
 *
 * Sanity-check the imported 2025-26 NHL coaching data. Reports:
 *   - All AUDIT-REQUIRED rows
 *   - All mid-season status rows (fired/hired/interim)
 *   - All unconfirmed roster rows
 *   - Per-team staff counts
 *
 * Usage: node scripts/verify-nhl-coaching-import.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = readFileSync('.env', 'utf8');
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// 1. Audit-flagged rows
const { data: audited } = await sb
  .from('nhl_coaching_staff')
  .select('nhl_team_id, role, name, status, notes')
  .eq('season', '2025-26')
  .like('notes', '%AUDIT-REQUIRED%')
  .order('nhl_team_id');
console.log(`\n=== Audit-required rows: ${audited?.length || 0} ===`);
for (const r of audited || []) {
  console.log(`  team=${r.nhl_team_id} ${r.role}: ${r.name} | status=${r.status}`);
  console.log(`    notes: ${r.notes?.slice(0, 120)}...`);
}

// 2. Mid-season changes
const { data: mid } = await sb
  .from('nhl_coaching_staff')
  .select('nhl_team_id, role, name, status, start_date, end_date')
  .eq('season', '2025-26')
  .in('status', ['hired_mid', 'left_mid', 'interim'])
  .order('nhl_team_id');
console.log(`\n=== Mid-season status rows: ${mid?.length || 0} ===`);
for (const r of mid || []) {
  console.log(`  team=${r.nhl_team_id} ${r.role}: ${r.name} | status=${r.status} | ${r.start_date} → ${r.end_date}`);
}

// 3. Unconfirmed assistant roster rows (Tampa, NYR, Montreal)
const { data: unc } = await sb
  .from('nhl_coaching_staff')
  .select('nhl_team_id, role, name, status')
  .eq('season', '2025-26')
  .eq('status', 'unconfirmed');
console.log(`\n=== Unconfirmed rows: ${unc?.length || 0} ===`);
for (const r of unc || []) {
  console.log(`  team=${r.nhl_team_id} ${r.role}: ${r.name}`);
}

// 4. Per-team staff counts
const { data: all } = await sb
  .from('nhl_coaching_staff')
  .select('nhl_team_id, role')
  .eq('season', '2025-26');
const byTeam = {};
for (const r of all || []) byTeam[r.nhl_team_id] = (byTeam[r.nhl_team_id] || 0) + 1;
console.log(`\n=== Per-team staff counts ===`);
for (const [tid, count] of Object.entries(byTeam).sort((a, b) => a[1] - b[1])) {
  const flags = [];
  if (count < 5) flags.push('LOW');
  if (count > 5) flags.push('HIGH');
  console.log(`  team ${tid}: ${count} staff${flags.length ? ' [' + flags.join(',') + ']' : ''}`);
}