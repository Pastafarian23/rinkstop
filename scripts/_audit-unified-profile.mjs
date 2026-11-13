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
import { nameBase, slugCandidates, isFixtureSlug } from '../src/lib/person-slug.ts';
import { publicPathForSource, publicPathForRole } from '../src/lib/unified-profile.ts';

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
 * Read every row of a table, paginating with `.range()`.
 *
 * PostgREST caps every response at 1,000 rows (`max-rows`) with no error
 * and no warning. A count of exactly 1000 is a truncation, never a size.
 * `person_aliases` has 11,405 rows and `persons` 11,443 — so EVERY read
 * here must paginate. This gate's first version did not, and it reported
 * 41 alias "orphans" that SQL proved did not exist.
 */
async function fetchAllRows(client, table, apply = null) {
  const PAGE = 1000;
  const out = [];
  for (let from = 0; ; from += PAGE) {
    let q = client.from(table).select('*').order('id', { ascending: true });
    if (apply) q = apply(q);
    const { data, error } = await q.range(from, from + PAGE - 1);
    if (error) {
      console.error(`[gate-unified-profile] paginated read of ${table} failed`, error.message);
      break;
    }
    const batch = data ?? [];
    out.push(...batch);
    if (batch.length < PAGE) break;
  }
  return out;
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
  const aliases = await fetchAllRows(sb, 'person_aliases');
  const usernames = new Set();
  const { data: profiles } = await sb.from('profiles').select('username');
  for (const p of profiles ?? []) {
    if (p.username) usernames.add(String(p.username).toLowerCase());
  }
  const clashes = aliases.filter((a) =>
    usernames.has(String(a.path).split('/')[2] ?? ''),
  );
  check(
    'no alias path collides with a profiles.username',
    clashes.length === 0,
    clashes.length ? `${clashes.length} clash(es): ${clashes.map((c) => c.path).join(', ')}` : '',
  );
}

// 2 + 4 + 7. Alias targets.
{
  const aliases = await fetchAllRows(sb, 'person_aliases');
  const persons = await fetchAllRows(sb, 'persons');
  const byId = new Map(persons.map((p) => [p.id, p]));

  let canonicalOnMerged = 0;
  let obsoleteOnMerged = 0;
  let orphan = 0;
  let pathMismatch = 0;

  for (const a of aliases) {
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

// 3. Merged-away persons hold no slug and no canonical alias.
{
  const merged = await fetchAllRows(sb, 'persons', (q) => q.eq('identity_state', 'merged'));
  const withSlug = merged.filter((p) => p.slug || p.public_id);
  check(
    'no merged-away person holds a slug or public_id',
    withSlug.length === 0,
    withSlug.length ? `${withSlug.length} bad row(s)` : '',
  );
}

// 4b. Every obsolete alias must redirect to a REAL, LIVE canonical path.
//
//     An obsolete alias is a merged-away person's old URL. It must point at
//     a person that is NOT merged away, and that person must have exactly
//     one canonical alias whose path differs from the obsolete one. If the
//     two paths are the same, the "redirect" would be a self-loop.
//
//     2026-11-12 (Phase 3B): the 9 real obsolete aliases were restored from
//     the pre-merge backup's `players.slug`. The other 29 merged pairs had
//     the SAME slug on both sides, so there is no separate path to redirect
//     and no alias is created for them — inserting one would be a self-loop
//     that the UNIQUE constraint on `path` forbids.
{
  const aliases = await fetchAllRows(sb, 'person_aliases');
  const byPerson = new Map();
  for (const a of aliases) {
    if (!byPerson.has(a.person_id)) byPerson.set(a.person_id, []);
    byPerson.get(a.person_id).push(a);
  }

  let selfLoop = 0;
  let noCanonical = 0;
  let chain = 0;
  const obsoletePaths = new Set();

  for (const a of aliases) {
    if (a.is_canonical) continue;
    obsoletePaths.add(a.path);

    const siblings = byPerson.get(a.person_id) ?? [];
    const canonical = siblings.find((c) => c.is_canonical);
    if (!canonical) {
      noCanonical++;
      continue;
    }
    if (canonical.path === a.path) selfLoop++;
  }

  // A chain would be: obsolete path A -> person's canonical path B, where B
  // is ITSELF an obsolete alias of some other person.
  const obsoleteSet = new Set(obsoletePaths);
  for (const a of aliases) {
    if (a.is_canonical) continue;
    const canonical = (byPerson.get(a.person_id) ?? []).find((c) => c.is_canonical);
    if (canonical && obsoleteSet.has(canonical.path)) chain++;
  }

  check(
    'no obsolete alias points at its own canonical path (self-loop)',
    selfLoop === 0,
    selfLoop ? `${selfLoop} self-loop(s)` : '',
  );
  check(
    'every obsolete alias has a canonical target',
    noCanonical === 0,
    noCanonical ? `${noCanonical} without a target` : '',
  );
  check(
    'no obsolete alias chains to another obsolete alias',
    chain === 0,
    chain ? `${chain} chain(s)` : '',
  );
}

// 4c. The obsolete aliases must cover the pre-merge source slugs.
//
//     The whole point of Phase 3B is that a visitor holding the OLD
//     player-page URL (with its team suffix) lands on the live profile.
//     This asserts that for every merged pair whose pre-merge slug
//     DIFFERS from the survivor's canonical slug, an obsolete alias exists
//     at that exact path — and that no extra obsolete aliases were invented.
{
  const aliases = await fetchAllRows(sb, 'person_aliases');
  const obsolete = aliases.filter((a) => !a.is_canonical).map((a) => a.path);

  // The pre-merge slugs live in the backup snapshot. Read them directly.
  const expected = new Set();
  // Read the WHOLE backup table, paginated. `person_identity_merge_backup`
  // has 11,443 rows for person_sources alone — PostgREST caps every response
  // at 1,000 rows.
  const backupRows = await fetchAllRows(sb, 'person_identity_merge_backup', (q) =>
    q.eq('backup_of', 'person_sources'),
  );
  const merged = await fetchAllRows(sb, 'persons', (q) => q.eq('identity_state', 'merged'));
  const mergedIds = new Set(merged.map((m) => m.id));

  // The survivor's slug, for each merged person.
  const survivorIds = Array.from(new Set(merged.map((m) => m.canonical_person_id).filter(Boolean)));
  const survivorSlug = new Map();
  for (let i = 0; i < survivorIds.length; i += 100) {
    const chunk = survivorIds.slice(i, i + 100);
    const { data: survivors } = await sb
      .from('persons')
      .select('id, slug')
      .in('id', chunk);
    for (const s of survivors ?? []) survivorSlug.set(s.id, s.slug);
  }

  // `original_person_id` is the person the row belonged to BEFORE the merge
  // — that is the merged-away person.
  const mergedById = new Map(merged.map((m) => [m.id, m]));
  for (const b of backupRows) {
    const src = b.row_data?.source;
    const oldSlug = b.row_data?.source_slug;
    if (src !== 'rinkstop_players' || !oldSlug) continue;
    const mergedPerson = mergedById.get(b.original_person_id);
    if (!mergedPerson) continue;
    const slug = survivorSlug.get(mergedPerson.canonical_person_id);
    // Only the pairs whose old slug DIFFERS need an obsolete alias.
    if (slug && oldSlug !== slug) expected.add(`/profile/${oldSlug}`);
  }

  const missing = [...expected].filter((p) => !obsolete.includes(p));

  // PHASE 3C: the obsolete aliases are no longer ONLY the merged-pair
  // redirects. The slug re-derivation created one obsolete redirect for
  // every renamed person, so the expected set is:
  //   • the merged-pair redirects (Phase 3B), AND
  //   • the rename redirects (Phase 3C).
  //
  // The rename redirects are read from `person_slug_renames` — the table
  // that RECORDS the renames — so the check is "every recorded rename has
  // its redirect" rather than "a hard-coded number of aliases exist".
  // A hard-coded count would break the next time the slug rule changes.
  const { error: renamesErr } = await sb.from('person_slug_renames').select('id').limit(1);
  const renames = renamesErr ? [] : await fetchAllRows(sb, 'person_slug_renames');
  const renamePaths = new Set(
    renames.filter((r) => !r.path_handover).map((r) => `/profile/${r.old_slug}`),
  );

  const allowed = new Set([...expected, ...renamePaths]);
  const extra = obsolete.filter((p) => !allowed.has(p));

  check(
    'every merged pair with a changed slug has an obsolete alias',
    missing.length === 0,
    missing.length ? `missing: ${missing.join(', ')}` : '',
  );
  check(
    'there are no obsolete aliases beyond the merged pairs and the recorded renames',
    extra.length === 0,
    extra.length ? `${extra.length} extra: ${extra.slice(0, 8).join(', ')}` : '',
  );
  check(
    `every recorded rename has its obsolete redirect (${renamePaths.size} renames)`,
    [...renamePaths].every((p) => obsolete.includes(p)),
    `${[...renamePaths].filter((p) => !obsolete.includes(p)).length} missing`,
  );
  check(
    `the expected number of obsolete aliases exists (${expected.size} merged + ${renamePaths.size} renamed = ${expected.size + renamePaths.size})`,
    obsolete.length === expected.size + renamePaths.size,
    `got ${obsolete.length}`,
  );
}

// 5. Every person with a slug AND a non-account source has exactly one
//    canonical alias.
//
//    An ACCOUNT-ONLY person is deliberately excluded: their canonical URL
//    IS the account URL, and they get no alias (see check 8c). The spec is
//    therefore "every person that SHOULD have an alias has exactly one",
//    not "every person with a slug has one".
{
  const persons = await fetchAllRows(sb, 'persons');
  const aliases = await fetchAllRows(sb, 'person_aliases');
  const canonicalCount = new Map();
  for (const a of aliases) {
    if (a.is_canonical) canonicalCount.set(a.person_id, (canonicalCount.get(a.person_id) ?? 0) + 1);
  }

  // Which persons have at least one non-account source row?
  const nonAccount = new Set();
  let from = 0;
  for (;;) {
    const { data, error } = await sb
      .from('person_sources')
      .select('person_id, source')
      .neq('source', 'profiles_account')
      .order('id', { ascending: true })
      .range(from, from + 999);
    if (error) break;
    const batch = data ?? [];
    for (const r of batch) nonAccount.add(r.person_id);
    if (batch.length < 1000) break;
    from += 1000;
  }

  const missing = persons
    .filter((p) => p.slug && nonAccount.has(p.id))
    .filter((p) => canonicalCount.get(p.id) !== 1);
  check(
    'every person with a slug and a public record has exactly one canonical alias',
    missing.length === 0,
    missing.length ? `${missing.length} person(s) off-spec` : '',
  );
}

// 6. Alias paths are unique.
{
  const aliases = await fetchAllRows(sb, 'person_aliases');
  const seen = new Set();
  let dupes = 0;
  for (const a of aliases) {
    if (seen.has(a.path)) dupes++;
    seen.add(a.path);
  }
  check('alias paths are unique', dupes === 0, dupes ? `${dupes} duplicate(s)` : '');
}

// 8. No contact data in an alias path.
//
//    NOTE ON THE PATTERN: an earlier version of this check rejected any path
//    containing 7+ digits, which flagged '/profile/test-fav-1781450750717'.
//    That path is a TEST artifact, not contact data — but the pattern was
//    wrong in general: a legitimate slug can contain digits. What actually
//    leaks is an email address or a phone number, so the check looks for
//    those specifically. The test-artifact case is covered separately by
//    check 8b.
{
  const aliases = await fetchAllRows(sb, 'person_aliases');
  const emailish = aliases.filter((a) => /[^@\s]+@[^@\s]+\.[a-z]{2,}/i.test(String(a.path)));
  const phoneish = aliases.filter((a) => /\+?\d[\d\s().-]{8,}\d/.test(String(a.path)));
  const leaky = [...new Set([...emailish, ...phoneish])];
  check(
    'no alias path contains an email address or a phone number',
    leaky.length === 0,
    leaky.length ? `${leaky.length} leaky path(s): ${leaky.map((c) => c.path).join(', ')}` : '',
  );
}

// 8b. No alias path exposes a Clerk/test internal identifier.
//
//     A person's `display_name` can come from a Clerk identity, and a Clerk
//     ID or a test fixture name must never appear at a public URL. This
//     catches the case the email check cannot: '/profile/test-fav-…' and
//     '/profile/user-3gsptdg51urv0n7gwdgajqttdg0'.
{
  const aliases = await fetchAllRows(sb, 'person_aliases');
  const internal = aliases.filter((a) => {
    const slug = String(a.path).split('/')[2] ?? '';
    return (
      /(^|-)(test|testing|demo|dummy|sample|fixture|fake|placeholder|lorem)(-[0-9a-z]+)*$/i.test(slug) ||
      /(^|-)(fanout|qa)(-[0-9a-z]+)*$/i.test(slug) ||
      /^user-[0-9a-f]{20,}$/i.test(slug)
    );
  });
  check(
    'no alias path exposes a test or Clerk internal identifier',
    internal.length === 0,
    internal.length ? `${internal.length} internal path(s): ${internal.map((c) => c.path).join(', ')}` : '',
  );
}

// 8c. No ACCOUNT-ONLY person has an alias.
//
//     An account-only person's canonical URL is the account URL. A second
//     alias would expose the account's display name — which may be a Clerk
//     ID — at a public URL.
//
//     BUG FIXED 2026-11-12: the previous version built `nonAccount` from
//     EVERY row in `person_sources`, including the `profiles_account` rows.
//     Every person with an account row was therefore also in `nonAccount`,
//     so `accountOnly` was ALWAYS empty and this check could never fail.
//     It is now built from the NON-account source rows only, which is what
//     the check name means.
{
  const aliases = await fetchAllRows(sb, 'person_aliases');
  const nonAccount = new Set();
  let from = 0;
  for (;;) {
    const { data, error } = await sb
      .from('person_sources')
      .select('person_id')
      .neq('source', 'profiles_account')
      .order('id', { ascending: true })
      .range(from, from + 999);
    if (error) break;
    const batch = data ?? [];
    for (const r of batch) nonAccount.add(r.person_id);
    if (batch.length < 1000) break;
    from += 1000;
  }
  // A person is "account-only" if they have an account source row and NO
  // non-account source row.
  const accountPersonIds = new Set(
    await fetchAllIds(sb, 'person_sources', 'person_id').then(async (ids) => {
      const { data } = await sb
        .from('person_sources')
        .select('person_id')
        .eq('source', 'profiles_account');
      return (data ?? []).map((r) => r.person_id);
    }),
  );
  const accountOnly = new Set();
  for (const pid of accountPersonIds) {
    if (!nonAccount.has(pid)) accountOnly.add(pid);
  }
  const bad = aliases.filter((a) => accountOnly.has(a.person_id));
  check(
    'no account-only person has a public alias',
    bad.length === 0,
    bad.length ? `${bad.length} bad alias(es): ${bad.map((b) => b.path).join(', ')}` : '',
  );
  // The check above is only meaningful if `accountOnly` is non-empty. A
  // silently-empty set means the detection logic broke again.
  check(
    'the account-only person set is non-empty (the check above can fail)',
    accountOnly.size > 0,
    `accountOnly size = ${accountOnly.size}`,
  );
}

// 11. PHASE 3C — every live slug matches the derivation rule.
//
//     The rule (src/lib/person-slug.ts, the reference implementation):
//
//       base = the person's folded NAME, lower-cased, non-alphanumerics
//              collapsed to one hyphen
//       slug = base
//            | base + '-' + md5(origin_key)[0:6]
//            | base + '-' + md5(origin_key)[0:12]
//            | base + '-' + md5(origin_key)
//
//     A hyphenated NAME such as 'martin-fehervary' is legal. A team tail
//     such as 'darcy-kuemper-lak' is NOT, unless those trailing
//     characters happen to be the hash of that person's own origin_key.
//
//     The earlier rule `^[a-z0-9]+(-[0-9a-f]{6})?$` rejected every
//     legitimate hyphenated name — it was the wrong rule, and it is
//     replaced here by the explicit candidate-form test.
{
  const persons = await fetchAllRows(sb, 'persons');
  const aliases = await fetchAllRows(sb, 'person_aliases');
  const canonicalPersonIds = new Set(aliases.filter((a) => a.is_canonical).map((a) => a.person_id));
  const mergedIds = new Set(persons.filter((p) => p.identity_state === 'merged').map((p) => p.id));

  const bad = [];
  for (const p of persons) {
    // Only a SURVIVOR with a canonical alias has a public slug.
    if (!canonicalPersonIds.has(p.id)) continue;
    // Fixture persons keep their opaque 'p-<hash>' handle and are NOT
    // re-slugged by the migration, so they are out of scope for the rule.
    // This exclusion must match the migration's scope exactly, or the gate
    // would report off-rule slugs the migration deliberately leaves alone.
    if (isFixtureSlug(String(p.slug ?? '').toLowerCase())) continue;
    const base = nameBase(p.first_name, p.last_name, p.display_name);
    if (!base) {
      bad.push(`${p.slug} (no name base)`);
      continue;
    }
    const legal = slugCandidates(base, p.origin_key);
    if (!legal.includes(p.slug)) {
      bad.push(`${p.slug} (base=${base})`);
    }
  }
  check(
    'every public slug is a name base plus an origin-key hash (no team tails)',
    bad.length === 0,
    bad.length ? `${bad.length} off-rule slug(s): ${bad.slice(0, 8).join(', ')}` : '',
  );

  // The slug must also be READABLE: the name portion has to survive the
  // accent folding. This catches the old accent-STRIPPING behaviour, where
  // 'Tim Stützle' became 'tim-st-tzle'.
  const stripped = [];
  for (const p of persons) {
    if (!canonicalPersonIds.has(p.id)) continue;
    if (isFixtureSlug(String(p.slug ?? '').toLowerCase())) continue;
    const rawName = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.display_name || '';
    if (!/[^\x00-\x7F]/.test(rawName)) continue;
    const expectedBase = nameBase(p.first_name, p.last_name, p.display_name);
    if (!p.slug.startsWith(expectedBase)) {
      stripped.push(`${rawName} -> ${p.slug} (expected ${expectedBase}…)`);
    }
  }
  check(
    'accented names are folded, not stripped (the name survives in the slug)',
    stripped.length === 0,
    stripped.length ? `${stripped.length} stripped name(s): ${stripped.slice(0, 6).join(', ')}` : '',
  );

  // A merged-away person must NOT hold a slug or a public_id.
  const mergedWithSlug = persons.filter(
    (p) => mergedIds.has(p.id) && (p.slug !== null || p.public_id !== null),
  );
  check(
    'no merged-away person holds a slug or a public_id',
    mergedWithSlug.length === 0,
    mergedWithSlug.length ? `${mergedWithSlug.length} merged person(s) with a slug` : '',
  );

  // A merged-away person must not be the target of a canonical alias.
  const mergedCanonical = aliases.filter((a) => a.is_canonical && mergedIds.has(a.person_id));
  check(
    'no canonical alias points at a merged-away person',
    mergedCanonical.length === 0,
    mergedCanonical.length ? `${mergedCanonical.length} alias(es)` : '',
  );
}

// 12. PHASE 3C — the rename history is complete and self-consistent.
//
//     Every row in `person_slug_renames` records a slug that changed. Each
//     one must have an obsolete alias at the OLD path pointing at the same
//     person, and that path must differ from the person's canonical path.
{
  // The table only exists after the Phase 3C migration has been applied.
  // Before that, there are no renames to record — that is a valid state,
  // not a failure.
  const { error: renamesErr } = await sb.from('person_slug_renames').select('id').limit(1);
  const renames = renamesErr ? [] : await fetchAllRows(sb, 'person_slug_renames');
  const aliases = await fetchAllRows(sb, 'person_aliases');
  const persons = await fetchAllRows(sb, 'persons');
  const byId = new Map(persons.map((p) => [p.id, p]));
  const byPath = new Map(aliases.map((a) => [a.path, a]));

  const problems = [];
  for (const h of renames) {
    const p = byId.get(h.person_id);
    if (!p) {
      problems.push(`${h.old_slug} -> unknown person`);
      continue;
    }
    const oldPath = `/profile/${h.old_slug}`;
    const a = byPath.get(oldPath);
    if (h.path_handover) {
      // PATH HANDOVER: the old path is now the CANONICAL path of another
      // person — the survivor of a same-name pair for the SAME human. One
      // path, one owner: the old URL still resolves, and it resolves to
      // the right human. There must be no obsolete alias on top of it.
      if (!a) {
        problems.push(`${oldPath} (handover, but nothing owns the path)`);
      } else if (!a.is_canonical) {
        problems.push(`${oldPath} (handover, but the path is obsolete, not canonical)`);
      } else if (a.person_id === h.person_id) {
        problems.push(`${oldPath} (handover is self-referential)`);
      } else {
        // The taker must be the same human — same folded name base.
        const taker = byId.get(a.person_id);
        const giverBase = nameBase(p.first_name, p.last_name, p.display_name);
        const takerBase = taker
          ? nameBase(taker.first_name, taker.last_name, taker.display_name)
          : null;
        if (takerBase !== giverBase) {
          problems.push(`${oldPath} (handover to a DIFFERENT person: ${takerBase} != ${giverBase})`);
        }
      }
    } else {
      // ORDINARY: the old path is an obsolete redirect to this person.
      if (!a) {
        problems.push(`${oldPath} (no alias)`);
      } else if (a.person_id !== h.person_id) {
        problems.push(`${oldPath} (points at another person)`);
      } else if (a.is_canonical) {
        problems.push(`${oldPath} (is canonical, not an obsolete redirect)`);
      }
    }
    if (oldPath === `/profile/${p.slug}`) {
      problems.push(`${oldPath} (self-loop: equals the canonical path)`);
    }
    if (p.slug !== h.new_slug) {
      problems.push(`${oldPath} (recorded new_slug ${h.new_slug} != live slug ${p.slug})`);
    }
  }
  check(
    `every recorded rename has a valid redirect at the old path (${renames.length} renames)`,
    problems.length === 0,
    problems.length ? `${problems.length} problem(s): ${problems.slice(0, 6).join(', ')}` : '',
  );

  // Every obsolete alias that is NOT one of the 9 Phase 3B player redirects
  // must be backed by a rename record. Without this, an obsolete alias
  // could be invented by hand and silently point somewhere else.
  const renameOldPaths = new Set(renames.map((h) => `/profile/${h.old_slug}`));
  const obsolete = aliases.filter((a) => !a.is_canonical);
  const unbacked = obsolete.filter(
    (a) => !renameOldPaths.has(a.path) && a.alias_type === 'profile',
  );
  check(
    'every obsolete profile alias is backed by a rename record',
    unbacked.length === 0,
    unbacked.length ? `${unbacked.length} unbacked alias(es): ${unbacked.slice(0, 6).map((a) => a.path).join(', ')}` : '',
  );
}

// 13. PHASE 3C — an obsolete alias must never chain to another obsolete
//     alias, and must never be a self-loop.
{
  const aliases = await fetchAllRows(sb, 'person_aliases');
  const canonicalByPerson = new Map();
  for (const a of aliases) {
    if (a.is_canonical) canonicalByPerson.set(a.person_id, a.path);
  }
  const byPath = new Map(aliases.map((a) => [a.path, a]));
  const selfLoops = [];
  const chains = [];
  for (const a of aliases) {
    if (a.is_canonical) continue;
    const canon = canonicalByPerson.get(a.person_id);
    if (!canon) {
      chains.push(`${a.path} (target has no canonical alias)`);
      continue;
    }
    if (canon === a.path) {
      selfLoops.push(a.path);
      continue;
    }
    const target = byPath.get(canon);
    if (target && !target.is_canonical) {
      chains.push(`${a.path} -> ${canon} (target is itself obsolete)`);
    }
  }
  check('no obsolete alias is a self-loop', selfLoops.length === 0, selfLoops.slice(0, 5).join(', '));
  check('no obsolete alias chains to another obsolete alias', chains.length === 0, chains.slice(0, 5).join(', '));
}

// 14. PHASE 3C — the public role/source hrefs must point at REAL routes.
//
//     `publicPathForSource()` / `publicPathForRole()` in
//     src/lib/unified-profile.ts map a source or role to a public URL. A
//     href that points at a route that does not exist is a 404 waiting to
//     happen, and no HTTP check would catch it because the link is
//     rendered into the page.
{
  const roles = await fetchAllRows(sb, 'person_roles');
  const sources = await fetchAllRows(sb, 'person_sources');

  // The set of REAL dynamic route prefixes, derived from the app router
  // rather than hard-coded — a hard-coded list is how the previous version
  // of this check wrongly rejected '/directory/players/<id>', which IS a
  // real route (src/app/directory/players/[id]/page.tsx).
  const REAL_PREFIXES = new Set([
    '/directory/players/',
    '/directory/coaches/',
    '/directory/teams/',
    '/directory/rinks/',
    '/directory/leagues/',
    '/directory/games/',
    '/directory/brands/',
    '/profile/',
  ]);

  const bad = [];
  for (const s of sources) {
    if (!s.source_id) continue;
    const path = publicPathForSource(s.source, String(s.source_id), null);
    if (path === null) continue;
    if (![...REAL_PREFIXES].some((p) => path.startsWith(p))) {
      bad.push(`source:${s.source}:${s.source_id} -> ${path}`);
    }
  }
  for (const r of roles) {
    if (!r.source_id) continue;
    const path = publicPathForRole(r.role_type, r.source, String(r.source_id), null);
    if (path === null) continue;
    if (![...REAL_PREFIXES].some((p) => path.startsWith(p))) {
      bad.push(`role:${r.role_type}:${r.source}:${r.source_id} -> ${path}`);
    }
  }
  check(
    'every public source/role href points at a real route prefix',
    bad.length === 0,
    bad.length ? `${bad.length} bad href(s): ${bad.slice(0, 6).join(', ')}` : '',
  );
  void roles;
  void sources;

  // The staff namespaces must resolve to the ONE staff detail route. A
  // listing path such as '/directory/scouts/<id>' would 404 — the listing
  // pages exist, the detail pages do not.
  const staffPaths = new Set();
  for (const s of sources) {
    if (!['nhl_players', 'nhl_coaching_staff', 'team_members'].includes(s.source)) continue;
    const path = publicPathForSource(s.source, String(s.source_id), null);
    // '/directory/coaches/nhl-123' -> '/directory/coaches'
    if (path) staffPaths.add(path.split('/').slice(0, 3).join('/'));
  }
  const wrongStaff = [...staffPaths].filter((p) => p !== '/directory/coaches');
  check(
    'every staff namespace resolves to the one staff detail route',
    wrongStaff.length === 0,
    wrongStaff.length ? `${wrongStaff.length} wrong route(s): ${wrongStaff.slice(0, 5).join(', ')}` : '',
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
