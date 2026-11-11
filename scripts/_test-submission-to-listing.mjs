// scripts/_test-submission-to-listing.mjs
// Live verification that an approved listing_submission actually creates a
// VISIBLE listing.
//
// WHY (2026-11-11):
//   `createListingFromSubmission` inserted teams into the LEGACY `teams`
//   table. Since commit 282c8bcf (2026-11-07) every public directory path
//   reads `team_workspaces` instead — so an approved team submission
//   created a row that never appeared on the site. Invisible listing.
//
//   This script creates a throwaway submission, runs the real
//   `createListingFromSubmission`, then asserts:
//     1. the listing row exists in the CANONICAL table
//     2. the row has the columns the directory reads (home_city, visibility)
//     3. the PUBLIC directory route resolves the slug (HTTP 200)
//     4. re-running is idempotent (no duplicate)
//
//   Everything it creates is deleted at the end.
//
// Usage: node scripts/_test-submission-to-listing.mjs
// Exit: 0 = PASS, 1 = FAIL

import './load-secrets.mjs';
import { createClient } from '@supabase/supabase-js';
import { createListingFromSubmission } from '../src/lib/listing-submission-to-listing.ts';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('FAIL: missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const STAMP = `zz-probe-${Date.now()}`;
const NAME = `ZZ Probe Club ${STAMP}`;
const CITY = 'Winnipeg';

const results = [];
function check(label, ok, detail = '') {
  results.push({ label, ok, detail });
  console.log(`${ok ? '  ✓' : '  ✗'} ${label}${detail ? ` — ${detail}` : ''}`);
}

let submissionId = null;
let createdId = null;
let createdTable = null;

try {
  // ── 1. Create a throwaway submission ───────────────────────────────────
  const { data: sub, error: subErr } = await sb
    .from('listing_submissions')
    .insert({
      listing_type: 'team',
      name: NAME,
      city: CITY,
      country: 'CA',
      email: 'probe@example.com',
      website: 'https://example.com',
      description: 'Probe submission for the submission→listing verification.',
      status: 'pending',
    })
    .select('*')
    .single();
  if (subErr) throw new Error(`submission insert failed: ${subErr.message}`);
  submissionId = sub.id;
  console.log(`\n=== created probe submission ${submissionId} ===`);

  // ── 2. Run the real listing creation ───────────────────────────────────
  const result = await createListingFromSubmission(sub);
  console.log(
    `   outcome=${result.outcome} entity=${result.entity} id=${result.listingId} url=${result.listingUrl}`,
  );
  check('listing creation succeeded', result.ok === true, result.error || '');

  createdId = result.listingId;
  createdTable =
    result.entity === 'team' ? 'team_workspaces' : result.entity === 'rink' ? 'rinks' : 'leagues';

  // ── 3. The row exists in the CANONICAL table ───────────────────────────
  const { data: row } = await sb
    .from(createdTable)
    .select('*')
    .eq('id', createdId)
    .maybeSingle();
  check(`row exists in canonical table (${createdTable})`, !!row);
  if (row) {
    check('visibility is public', row.visibility === 'public', `visibility=${row.visibility}`);
    check('is_published is true', row.is_published === true, `is_published=${row.is_published}`);
    check('is_active is true', row.is_active === true, `is_active=${row.is_active}`);
    check('age_category set', !!row.age_category, `age_category=${row.age_category}`);
    if (createdTable === 'team_workspaces') {
      check(
        'home_city populated (directory reads home_city, not city)',
        row.home_city === CITY,
        `home_city=${row.home_city}`,
      );
    }
  }

  // ── 4. The PUBLIC directory route resolves the slug ─────────────────────
  if (result.listingUrl) {
    const url = `https://rinkstop.com${result.listingUrl}`;
    const res = await fetch(url, { redirect: 'follow' });
    const html = await res.text();
    check(
      'public directory URL returns 200',
      res.status === 200,
      `status=${res.status} url=${url}`,
    );
    check(
      'public page actually contains the listing name',
      html.includes(NAME),
      html.includes(NAME) ? '' : 'name not found in rendered HTML',
    );
  }

  // ── 5. Idempotency — a second run must not create a duplicate ─────────
  const second = await createListingFromSubmission({
    ...sub,
    notes: `Listing created from this submission: ${createdTable}/${createdId}.`,
  });
  check(
    'second run is idempotent (matched, no duplicate)',
    second.outcome === 'matched' && second.listingId === createdId,
    `outcome=${second.outcome} id=${second.listingId}`,
  );
} catch (err) {
  check('no exception thrown', false, err.message);
} finally {
  // ── cleanup ─────────────────────────────────────────────────────────────
  console.log('\n=== cleanup ===');
  if (createdId && createdTable) {
    const { error } = await sb.from(createdTable).delete().eq('id', createdId);
    console.log(`   deleted ${createdTable}/${createdId}${error ? ` — ERROR ${error.message}` : ''}`);
  }
  if (submissionId) {
    const { error } = await sb.from('listing_submissions').delete().eq('id', submissionId);
    console.log(`   deleted submission ${submissionId}${error ? ` — ERROR ${error.message}` : ''}`);
  }
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
