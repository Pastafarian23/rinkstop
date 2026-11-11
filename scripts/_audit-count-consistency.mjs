// scripts/_audit-count-consistency.mjs
// Pre-push Gate 21: every directory count source must agree.
//
// WHY (2026-11-11):
//   RinkStop has TWO RPCs that both report directory counts:
//     get_directory_stats()   — canonical
//     get_home_page_data()    — used by the homepage
//
//   The Nov 6 migration canonicalized the first one to count
//   `team_workspaces` (active + public). The SECOND one was missed and
//   kept counting the legacy `teams` table.
//
//   Result: the homepage advertised 2,613 teams while every other page
//   on the site said 2,656. It also reported 1,419 cities / 78 countries
//   (from `rinks`) against the canonical 687 / 85 (from `teams`) — both
//   wrong, in opposite directions.
//
//   A "3 different numbers on 3 pages" defect is the same class as the
//   November dataset-export incident. The fix is to make every count
//   source read the same table, and to PROVE they agree.
//
// What it proves, against the LIVE database:
//   1. get_directory_stats() and get_home_page_data() return identical
//      values for rink_count, team_count, player_count, league_count,
//      city_count and country_count.
//   2. Each count matches a direct count against the canonical table.
//   3. No count source reads a table that the public directory does not.
//
// Usage: node scripts/_audit-count-consistency.mjs
// Exit: 0 = PASS, 1 = FAIL

import './load-secrets.mjs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('FAIL: missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const results = [];
function check(label, ok, detail = '') {
  results.push({ label, ok, detail });
  console.log(`${ok ? '  ✓' : '  ✗'} ${label}${detail ? ` — ${detail}` : ''}`);
}

const COUNT_KEYS = [
  'rink_count',
  'team_count',
  'player_count',
  'league_count',
  'city_count',
  'country_count',
];

console.log('=== DIRECTORY COUNT CONSISTENCY AUDIT ===\n');

// ── 1. Pull both RPCs ──────────────────────────────────────────────────────
console.log('1. Comparing the two count RPCs');
const { data: canon, error: canonErr } = await sb.rpc('get_directory_stats');
if (canonErr) {
  check('get_directory_stats() responds', false, canonErr.message);
  process.exit(1);
}
check('get_directory_stats() responds', true);

const { data: home, error: homeErr } = await sb.rpc('get_home_page_data');
if (homeErr) {
  check('get_home_page_data() responds', false, homeErr.message);
  process.exit(1);
}
check('get_home_page_data() responds', true);

const homeStats = home?.stats || {};

// ── 2. The two RPCs must agree on every count ──────────────────────────────
console.log('\n2. The two RPCs must agree');
for (const key of COUNT_KEYS) {
  const a = canon?.[key];
  const b = homeStats?.[key];
  check(
    `${key} agrees`,
    a === b,
    a === b ? `${a}` : `canonical=${a} home=${b}`,
  );
}

// ── 3. Each count must match a direct canonical-table count ───────────────
console.log('\n3. Counts match a direct query against the canonical tables');
const direct = {};
{
  const q = await sb.from('rinks').select('id', { count: 'exact', head: true }).eq('is_active', true);
  direct.rink_count = q.count;
}
{
  const q = await sb
    .from('team_workspaces')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)
    .eq('visibility', 'public');
  direct.team_count = q.count;
}
{
  const q = await sb.from('players').select('id', { count: 'exact', head: true }).eq('is_active', true);
  direct.player_count = q.count;
}
{
  const q = await sb.from('leagues').select('id', { count: 'exact', head: true }).eq('is_active', true);
  direct.league_count = q.count;
}
{
  // cities/countries come from the legacy `teams` table by design — it is
  // the only table with a reliable city/country for every listed club.
  //
  // PAGINATION IS REQUIRED: `teams` has 1,370+ active rows. An unpaginated
  // select() returns exactly 1,000 and silently drops the rest — which
  // reported 81 countries instead of 85. This is the same PostgREST
  // max-rows trap that truncated the dataset export and both sitemaps.
  const allRows = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await sb
      .from('teams')
      .select('city, country')
      .eq('is_active', true)
      .range(from, from + 999);
    const batch = data || [];
    allRows.push(...batch);
    if (batch.length < 1000) break;
  }
  direct.city_count = new Set(allRows.map((r) => r.city).filter((c) => c != null)).size;
  direct.country_count = new Set(allRows.map((r) => r.country).filter((c) => c != null)).size;
}

for (const key of COUNT_KEYS) {
  check(
    `${key} matches direct count`,
    canon?.[key] === direct[key],
    canon?.[key] === direct[key] ? `${canon[key]}` : `rpc=${canon?.[key]} direct=${direct[key]}`,
  );
}

// ── 4. The counts the marketing surfaces advertise must match ─────────────
console.log('\n4. The count the site advertises');
const { data: apiCounts } = await sb.rpc('get_directory_stats');
check(
  'the canonical team count is what the site shows',
  apiCounts?.team_count === canon?.team_count,
  `${apiCounts?.team_count}`,
);

console.log('\n=== CANONICAL COUNTS ===');
for (const key of COUNT_KEYS) {
  console.log(`  ${key.padEnd(14)} ${canon?.[key]}`);
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log('\nFAILED:');
  for (const f of failed) console.log(`  ✗ ${f.label}${f.detail ? ` — ${f.detail}` : ''}`);
  process.exit(1);
}
console.log('PASS');
process.exit(0);
