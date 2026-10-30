#!/usr/bin/env node
/**
 * Audit every Supabase `.from('team_workspaces').select(...)` in the repo
 * against the REAL column list of the live `team_workspaces` table.
 *
 * WHY THIS EXISTS (2026-10-30):
 *   `team_workspaces` was migrated from the legacy `teams` table and its
 *   columns were RENAMED:
 *       teams.city           -> team_workspaces.home_city
 *       teams.country        -> team_workspaces.home_country
 *       teams.state_province -> team_workspaces.home_state
 *       teams.logo_url       -> team_workspaces.avatar_url
 *   Nine call sites still used the legacy names. PostgREST returns
 *   "column team_workspaces.city does not exist" (42703), and the
 *   fail-safe wrappers turned that into an EMPTY result set — so the
 *   public claim page reported "No teams found" for a team that was
 *   live in the database. Slough Satans hit exactly this.
 *
 * The schema is read from the LIVE table (not hardcoded), so it stays
 * correct as the schema evolves.
 *
 * Usage:  node scripts/_audit-team-workspace-columns.mjs
 * Exit 0 = clean, 1 = at least one broken select found.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const ROOT = process.cwd();
const SKIP_DIRS = new Set([
  'node_modules', '.next', '.git', '.vercel', 'dist', 'build', 'coverage',
  // Stale compiled copies of the app (checked-in build output).
  'android', 'ios', 'public',
]);

const LEGACY_ONLY = {
  city: 'home_city',
  country: 'home_country',
  state_province: 'home_state',
  province_state: 'home_state',
  logo_url: 'avatar_url',
};

function envVar(name) {
  for (const f of ['.env.local', '.env', '.env.production']) {
    try {
      const txt = readFileSync(join(ROOT, f), 'utf8');
      const m = txt.match(new RegExp(`^${name}=(.*)$`, 'm'));
      if (m) return m[1].trim().replace(/^["']|["']$/g, '');
    } catch {}
  }
  return process.env[name];
}

async function liveColumns() {
  const url = envVar('NEXT_PUBLIC_SUPABASE_URL');
  const key = envVar('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  const sb = createClient(url, key);
  const { data, error } = await sb.from('team_workspaces').select('*').limit(1);
  if (error) throw new Error(`Could not read team_workspaces: ${error.message}`);
  if (!data || !data.length) throw new Error('team_workspaces returned no rows — cannot infer schema');
  return new Set(Object.keys(data[0]));
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const p = join(dir, entry);
    let st;
    try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|mjs|js)$/.test(entry)) out.push(p);
  }
  return out;
}

/** Pull the column list out of a `.select('...')` string. */
function parseSelectCols(selectStr) {
  return selectStr
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      // Embedded resources: leagues!teams_league_id_fkey(name, slug)
      //   -> the ALIAS before '!' is not a column of this table.
      //      Everything after '!' describes the OTHER table.
      const bang = s.indexOf('!');
      if (bang !== -1) return null; // embedded resource — skip entirely
      // Bare `leagues` (implicit embed) is also not a column.
      if (s === 'leagues') return null;
      return s.trim();
    })
    .filter((c) => c && /^[a-z_][a-z0-9_]*$/i.test(c));
}

const columns = await liveColumns();
console.log(`Live team_workspaces columns: ${columns.size}\n`);

const files = walk(ROOT);
const problems = [];

for (const file of files) {
  const rel = relative(ROOT, file);
  let src;
  try {
    src = readFileSync(file, 'utf8');
  } catch {
    continue;
  }

  const fromRe = /\.from\(\s*['"]team_workspaces['"]\s*\)/g;
  let m;
  while ((m = fromRe.exec(src)) !== null) {
    const window = src.slice(m.index, m.index + 400);
    const selMatch = window.match(/\.select\(\s*(['"`])([^'"`]*)\1/);
    if (!selMatch) continue;
    const cols = parseSelectCols(selMatch[2]);
    const line = src.slice(0, m.index).split('\n').length;

    for (const col of cols) {
      if (columns.has(col)) continue;
      problems.push({
        file: rel,
        line,
        column: col,
        legacy: LEGACY_ONLY[col] || null,
        snippet: selMatch[2].slice(0, 160),
      });
    }
  }
}

if (problems.length === 0) {
  console.log('✓ No invalid team_workspaces column references found.');
  console.log(`  (scanned ${files.length} files)`);
  process.exit(0);
}

console.log(`✗ ${problems.length} invalid team_workspaces column reference(s):\n`);
for (const p of problems) {
  console.log(`  ${p.file}:${p.line}  column "${p.column}"`);
  console.log(`     select('${p.snippet}')`);
  if (p.legacy) console.log(`  → legacy 'teams' name; use team_workspaces.${p.legacy}`);
  else console.log(`  → column does not exist on team_workspaces`);
  console.log('');
}
process.exit(1);
