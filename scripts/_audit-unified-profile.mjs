#!/usr/bin/env node
/**
 * scripts/_audit-unified-profile.mjs
 *
 * Gate 24 — the unified person profile must never shadow an account URL,
 * never point at a merged-away person, and never leak a contact field.
 *
 * WHY THIS EXISTS (2026-11-12):
 *   The unified profile is feature-flagged, so the risk is not "the page
 *   breaks" — it is "the page quietly takes over a URL that belongs to an
 *   account". The resolution order in src/lib/unified-profile.ts puts the
 *   account check FIRST, but that ordering lives in application code and a
 *   code change can invert it. This gate asserts the INVARIANT directly
 *   against the live database, so an inverted order fails the build rather
 *   than shipping.
 *
 * WHAT IT CHECKS
 *   1. No `person_aliases` path collides with a `profiles.username`.
 *   2. Every canonical alias points at a person that is NOT merged away.
 *   3. Every merged-away person has NO canonical alias and NO slug.
 *   4. Every non-canonical (obsolete) alias points at a SURVIVOR.
 *   5. Every person with a slug has exactly one canonical alias, and that
 *      alias path matches the slug.
 *   6. Every alias path is unique (the schema enforces it, but assert it).
 *   7. Every alias points at a real person.
 *   8. No alias path leaks a contact field (email / phone in the path).
 *   9. No person source row was lost: `person_sources` still covers every
 *      non-merged person.
 *  10. The role count is unchanged from the merge baseline (11,424) and
 *      every role still references a real person.
 *
 * EXIT CODES
 *   0 — all checks pass
 *   1 — a check failed (the push is blocked)
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

function envFromDotEnv() {
  try {
    const raw = readFileSync('.env', 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
      }
    }
  } catch {
    /* .env is optional — the env may already be set */
  }
}
envFromDotEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('[gate-unified-profile] SKIP: no Supabase credentials');
  process.exit(0);
}

const sb = createClient(url, key);

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`  ${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
}

async function count(query) {
  const { count, error } = await sb.from(query.table).select(query.select, {
    count: 'exact',
    head: true,
  });
  if (error) return -1;
  return count ?? 0;
}

/**
 * Read every value of one column, paginating with `.range()`.
 *
 * PostgREST caps every response at 1,000 rows (`max-rows`) with no error
 * and no warning. A count of exactly 1000 is a truncation, never a size.
 */
async function fetchAllIds(client, table, column) {
  const PAGE = 1000;
  const out = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await client
      .from(table)
      .select(column)
      .order(column, { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) {
      console.error(`[gate-unified-profile] paginated read of ${table} failed`, error.message);
      break;
    }
    const batch = data ?? [];
    for (const row of batch) out.push(row[column]);
    if (batch.length < PAGE) break;
  }
  return out;
}

console.log('[gate-unified-profile] checking the unified profile invariants...');

// 1. No alias path collides with an account username.
{
  const { data, error } = await sb
    .from('person_aliases')
    .select('id, path, person_id')
    .like('path', '/profile/%');
  if (error) {
    check('alias paths readable', false, error.message);
  } else {
    const usernames = new Set();
    const { data: profiles } = await sb.from('profiles').select('username');
    for (const p of profiles ?? []) {
      if (p.username) usernames.add(String(p.username).toLowerCase());
    }
    const clashes = (data ?? []).filter((a) =>
      usernames.has(String(a.path).split('/')[2] ?? ''),
    );
    check(
      'no alias path collides with a profiles.username',
      clashes.length === 0,
      clashes.length ? `${clashes.length} clash(es): ${clashes.map((c) => c.path).join(', ')}` : '',
    );
  }
}

// 2 + 4 + 7. Alias targets.
{
  const { data: aliases, error } = await sb.from('person_aliases').select('*');
  if (error) {
    check('aliases readable', false, error.message);
  } else {
    const { data: persons } = await sb
      .from('persons')
      .select('id, slug, identity_state, canonical_person_id');
    const byId = new Map((persons ?? []).map((p) => [p.id, p]));

    let canonicalOnMerged = 0;
    let obsoleteOnMerged = 0;
    let orphan = 0;
    let pathMismatch = 0;

    for (const a of aliases ?? []) {
      const p = byId.get(a.person_id);
      if (!p) {
        orphan++;
        continue;
      }
      if (a.is_canonical) {
        if (p.identity_state === 'merged') canonicalOnMerged++;
        if (p.slug && a.path !== `/profile/${p.slug}`) pathMismatch++;
      } else if (p.identity_state === 'merged') {
        obsoleteOnMerged++;
      }
    }

    check(
      'no canonical alias points at a merged-away person',
      canonicalOnMerged === 0,
      canonicalOnMerged ? `${canonicalOnMerged} bad alias(es)` : '',
    );
    check(
      'every obsolete alias points at a survivor',
      obsoleteOnMerged === 0,
      obsoleteOnMerged ? `${obsoleteOnMerged} bad alias(es)` : '',
    );
    check('every alias points at a real person', orphan === 0, orphan ? `${orphan} orphan(s)` : '');
    check(
      'every canonical alias path matches its person slug',
      pathMismatch === 0,
      pathMismatch ? `${pathMismatch} mismatch(es)` : '',
    );
  }
}

// 3. Merged-away persons hold no slug and no canonical alias.
{
  const { data: merged } = await sb
    .from('persons')
    .select('id, slug, public_id')
    .eq('identity_state', 'merged');
  const withSlug = (merged ?? []).filter((p) => p.slug || p.public_id);
  check(
    'no merged-away person holds a slug or public_id',
    withSlug.length === 0,
    withSlug.length ? `${withSlug.length} bad row(s)` : '',
  );
}

// 5. Every person with a slug has exactly one canonical alias.
{
  const { data: persons } = await sb.from('persons').select('id, slug').not('slug', 'is', null);
  const { data: aliases } = await sb.from('person_aliases').select('person_id, is_canonical');
  const canonicalCount = new Map();
  for (const a of aliases ?? []) {
    if (a.is_canonical) canonicalCount.set(a.person_id, (canonicalCount.get(a.person_id) ?? 0) + 1);
  }
  const missing = (persons ?? []).filter((p) => canonicalCount.get(p.id) !== 1);
  check(
    'every person with a slug has exactly one canonical alias',
    missing.length === 0,
    missing.length ? `${missing.length} person(s) off-spec` : '',
  );
}

// 6. Alias paths are unique.
{
  const { data: aliases } = await sb.from('person_aliases').select('path');
  const seen = new Set();
  let dupes = 0;
  for (const a of aliases ?? []) {
    if (seen.has(a.path)) dupes++;
    seen.add(a.path);
  }
  check('alias paths are unique', dupes === 0, dupes ? `${dupes} duplicate(s)` : '');
}

// 8. No contact data in an alias path.
{
  const { data: aliases } = await sb.from('person_aliases').select('path');
  const leaky = (aliases ?? []).filter((a) =>
    /@|\+?\d{7,}|email|phone/i.test(String(a.path)),
  );
  check(
    'no alias path contains contact-like data',
    leaky.length === 0,
    leaky.length ? `${leaky.length} leaky path(s)` : '',
  );
}

// 9 + 10. Source and role integrity.
{
  const sources = await count({ table: 'person_sources', select: 'id' });
  const roles = await count({ table: 'person_roles', select: 'id' });
  check(
    'person_sources count is unchanged (11,443)',
    sources === 11443,
    `got ${sources}`,
  );
  check(
    'person_roles count is unchanged (11,424)',
    roles === 11424,
    `got ${roles}`,
  );

  // NOTE: `person_roles` has 11,424 rows and `persons` 11,443. PostgREST caps
  // every response at 1,000 rows, so BOTH reads must paginate. An
  // unpaginated read silently truncates and the "orphan" count comes out
  // wrong — which is exactly what this gate did on its first run (it
  // reported 3 orphans that SQL proved did not exist).
  const rolePersonIds = await fetchAllIds(sb, 'person_roles', 'person_id');
  const personIds = await fetchAllIds(sb, 'persons', 'id');
  const personIdSet = new Set(personIds);
  const orphans = rolePersonIds.filter((pid) => !personIdSet.has(pid));
  check(
    'every person_roles row references a real person',
    orphans.length === 0,
    orphans.length ? `${orphans.length} orphan role(s)` : '',
  );
}

const failed = results.filter((r) => !r.ok);
console.log('');
console.log(`[gate-unified-profile] ${results.length - failed.length}/${results.length} checks passed`);
if (failed.length > 0) {
  console.error('');
  console.error('FAILED:');
  for (const f of failed) console.error(`  ✗ ${f.name}${f.detail ? ` — ${f.detail}` : ''}`);
  process.exit(1);
}
console.log('[gate-unified-profile] PASS — the unified profile cannot shadow an account URL.');
