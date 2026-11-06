#!/usr/bin/env node
// scripts/_audit-embed-columns.mjs
//
// Pre-push Gate 14: every embedded relation used in the app must resolve
// against the live schema.
//
// WHY (2026-11-06, roster system Phase 1):
//   Repointing the team FKs from the legacy `teams` table to the canonical
//   `team_workspaces` broke every embed of the old relation, because
//   PostgREST names an embedded relation after the FK's referenced table.
//   The public routes went to HTTP 500 with
//     "Could not find a relationship between 'players' and 'teams'"
//   and then, after the relation was renamed, with
//     "column team_workspaces_1.logo_url does not exist"
//   because `logo_url` is a legacy-`teams` column — on `team_workspaces` the
//   equivalent is `avatar_url`.
//
//   `tsc` cannot catch either: an embed is a string, and the column it
//   names is only validated by PostgREST at runtime.
//
//   This audit extracts every embedded relation string out of the app
//   source, pairs it with the table it is embedded on, and asks the live
//   database to resolve it. Anything PostgREST would reject at runtime
//   fails here instead.
//
// Usage: node scripts/_audit-embed-columns.mjs
// Exit: 0 = PASS, 1 = FAIL

import './load-secrets.mjs';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('FAIL: missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const SRC = 'src';

/** Recursively list .ts/.tsx files under a directory. */
function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (entry === 'node_modules' || entry === '.next') continue;
      walk(p, out);
    } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
      out.push(p);
    }
  }
  return out;
}

/**
 * Find every `.from('<table>').select('...<embed>...')` pairing.
 *
 * The embed strings are PostgREST relation hints, e.g.
 *   home_team:team_workspaces!home_team_id(name, slug, logo_url:avatar_url)
 * A relation hint is recognised by the `alias:relation!hint(cols)` shape.
 */
function extractEmbeds() {
  const pairs = new Map(); // embed -> table
  const files = walk(SRC);

  // Matches: .from('table') ... .select(' ... embed ... ')
  const fromRe = /\.from\('([a-z_]+)'\)/g;
  // Matches a relation hint inside a select string. The column list may
  // contain NESTED relation hints (e.g.
  // `team_workspaces!(..., home_rink:rinks!(...))`), so the body is matched
  // with balanced parentheses rather than `[^)]*`.
  const embedRe = /([a-z_]+!?[a-z_]*):([a-z_]+!?[A-Za-z0-9_]*\((?:[^()]|\((?:[^()]|\([^()]*\))*\))*\))/g;

  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    // Work per select() call: capture the table context from the nearest
    // preceding .from().
    const selectRe = /\.select\(\s*['"`]([^'"`]*?)['"`]/g;
    let m;
    while ((m = selectRe.exec(src)) !== null) {
      const selectBody = m[1];
      // nearest .from() before this select
      const before = src.slice(0, m.index);
      let table = null;
      let fm;
      fromRe.lastIndex = 0;
      while ((fm = fromRe.exec(before)) !== null) table = fm[1];
      if (!table) continue;

      // Only TOP-LEVEL relations are embeds OF `table`. A relation nested
      // inside another relation is an embed of that relation's target, and
      // testing it against `table` produces a false failure.
      let em;
      embedRe.lastIndex = 0;
      while ((em = embedRe.exec(selectBody)) !== null) {
        const alias = em[1];
        const relation = em[2];
        const before = selectBody.slice(0, em.index);
        // Depth of this relation = number of unbalanced '(' before it.
        const depth = (before.match(/\(/g) || []).length - (before.match(/\)/g) || []).length;
        if (depth === 0) {
          if (!pairs.has(relation)) pairs.set(relation, table);
        }
      }
    }
  }
  return pairs;
}

async function main() {
  const pairs = extractEmbeds();
  console.log(`  distinct embedded relations in ${SRC}: ${pairs.size}`);

  const failures = [];
  let ok = 0;

  for (const [relation, table] of pairs.entries()) {
    const cols = relation.slice(relation.indexOf('(') + 1, -1);
    // Select ONLY the embedded relation. The embedded columns live inside
    // the relation hint, so prefixing `id,` would make PostgREST look for
    // those columns on the parent table.
    const { error } = await sb.from(table).select(relation).limit(1);
    if (error) {
      failures.push(`${table} -> ${relation} :: ${error.message}`);
    } else {
      ok++;
    }
  }

  console.log(`  resolved: ${ok} | failed: ${failures.length}`);
  console.log('');

  if (failures.length > 0) {
    console.error('=== EMBED COLUMN AUDIT: FAIL ===');
    for (const f of failures) console.error('  FAIL:', f);
    process.exit(1);
  }
  console.log('=== EMBED COLUMN AUDIT: PASS ===');
  console.log('  every embedded relation resolves against the live schema.');
}

main().catch((e) => {
  console.error('=== EMBED COLUMN AUDIT: ERROR ===');
  console.error(e);
  process.exit(1);
});
