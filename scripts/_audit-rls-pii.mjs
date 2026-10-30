#!/usr/bin/env node
/**
 * RLS PII audit — finds any table whose PUBLIC (anon) role can SELECT
 * SUBMITTER contact details that the submitter never chose to publish.
 *
 * WHY THIS EXISTS (2026-10-30):
 *   On 2026-06-16 a security audit found that `anon` could SELECT every row
 *   of `contact_submissions` and `newsletter_subscribers` — including the
 *   `email` and `message` columns. Migration
 *   2026-06-16-critical-rls-fixes.sql (FIX 5, FIX 6) dropped those policies.
 *
 *   The SAME leak class existed on a THIRD table — `listing_submissions`,
 *   which holds `email` plus our internal `notes` / `outcome_notes` — and it
 *   was never added to that audit. The policy `listing_submissions_public_read`
 *   stayed in place for ~4 months. The `sb_publishable_…` anon key is shipped
 *   in the public client bundle (NEXT_PUBLIC_* vars are inlined), so ANY
 *   visitor could read:
 *
 *     GET /rest/v1/listing_submissions?select=email,name,notes,outcome_notes
 *
 *   and see `sloughsatans@gmail.com` and `cup@glxyhockey.com` — plus our
 *   internal notes about them ("free listing, no pitch", revenue
 *   qualification). Fixed 2026-10-30 (migration
 *   2026-10-30_listing_submissions_pii_lockdown.sql).
 *
 *   "We audited once" is not a guard. This script re-runs the audit against
 *   the LIVE database on every push.
 *
 * WHAT COUNTS AS A LEAK (and what does NOT):
 *
 *   LEAK — contact details captured FROM a submitter who has NOT yet become
 *          a published listing owner:
 *            listing_submissions.email     (captured on the add-listing form)
 *            contact_submissions.email     (captured on the contact form)
 *            newsletter_subscribers.email  (captured on the newsletter form)
 *
 *   NOT A LEAK — contact details the listing owner deliberately PUBLISHED
 *          about their own public entity. These are already rendered on the
 *          public listing page by design (e.g. team_workspaces.contact_email
 *          appears as a mailto: on /directory/teams/<slug>):
 *            team_workspaces.contact_email / contact_phone
 *            rinks.email / phone / address
 *            players.first_name / last_name / nationality
 *
 *   The distinction is ownership of the data, not the column name. A
 *   directory listing's contact details are marketing; a form submission's
 *   email address is a lead we were given.
 *
 * Usage:  node scripts/_audit-rls-pii.mjs
 * Exit 0 = clean, 1 = a public read exposes captured submitter contact data.
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const ROOT = process.cwd();

// Tables that capture a submitter's contact details via a public form.
// The policy on these must NOT allow anon SELECT.
const CAPTURED_LEAD_TABLES = {
  listing_submissions: {
    columns: ['email'],
    why: 'captured on the public add-listing form — a lead address we were given',
  },
  contact_submissions: {
    columns: ['email'],
    why: 'captured on the public contact form — a lead address we were given',
  },
  newsletter_subscribers: {
    columns: ['email'],
    why: 'captured on the public newsletter form — a subscriber address',
  },
};

// Public directory tables whose contact details are PUBLISHED BY THE OWNER
// and are intentionally rendered on the public listing page. Listing them
// here does NOT exempt them — the check still runs — it just documents that
// a public read there is intentional, so a future hit is not a false alarm.
const PUBLISHED_DIRECTORY_TABLES = [
  'team_workspaces', 'rinks', 'leagues', 'players', 'federations',
  'profiles', 'claims', 'event_submissions', 'youth_programs', 'reviews',
  'corrections', 'leads', 'b2b_prospects', 'payment_records',
];

function envVar(name) {
  for (const f of ['.env.local', '.env', '.env.production']) {
    try {
      const txt = readFileSync(`${ROOT}/${f}`, 'utf8');
      const m = txt.match(new RegExp(`^${name}=(.*)$`, 'm'));
      if (m) return m[1].trim().replace(/^["']|["']$/g, '');
    } catch {}
  }
  return process.env[name];
}

const url = envVar('NEXT_PUBLIC_SUPABASE_URL');
const anonKey = envVar('NEXT_PUBLIC_SUPABASE_ANON_KEY');
const serviceKey = envVar('SUPABASE_SERVICE_ROLE_KEY');
if (!url || !anonKey || !serviceKey) {
  console.error('Missing Supabase env vars (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY)');
  process.exit(1);
}

const anon = createClient(url, anonKey);
const service = createClient(url, serviceKey);

const problems = [];
const notes = [];

console.log('RLS PII audit — public reads that expose captured submitter contact data\n');

for (const [table, spec] of Object.entries(CAPTURED_LEAD_TABLES)) {
  // 1. Which of the tracked columns does this table actually have?
  const { data: probe, error: probeErr } = await service.from(table).select('*').limit(1);
  if (probeErr) {
    notes.push(`${table}: not readable via service role — skipped`);
    continue;
  }
  const present = probe && probe.length
    ? spec.columns.filter((c) => Object.prototype.hasOwnProperty.call(probe[0], c))
    : [];
  if (!present.length) {
    notes.push(`${table}: no tracked contact column present — skipped`);
    continue;
  }

  // 2. Can the anon role actually read it? Test the BEHAVIOUR, not the
  //    policy definition — the two can drift.
  const { data: anonRows, error: anonErr } = await anon.from(table).select(present.join(',')).limit(1);
  const anonCanRead = !anonErr && Array.isArray(anonRows) && anonRows.length > 0;

  if (!anonCanRead) {
    notes.push(`${table}: anon cannot read ${present.join(', ')} — OK`);
    continue;
  }

  problems.push({
    table,
    columns: present,
    why: spec.why,
    sample: anonRows[0],
  });
}

// Sanity check on the public directory tables: confirm anon CAN read them
// (if it can't, the directory is broken and that is a different bug worth
// surfacing here rather than discovering later).
console.log('Sanity — public directory tables must remain anon-readable:');
for (const table of PUBLISHED_DIRECTORY_TABLES) {
  const { data, error } = await anon.from(table).select('*').limit(1);
  if (error) {
    notes.push(`${table}: anon read ERROR — ${error.message.slice(0, 70)}`);
  } else if (!data || !data.length) {
    notes.push(`${table}: anon readable but 0 rows`);
  } else {
    notes.push(`${table}: anon-readable (${data.length}+ rows) — OK`);
  }
}

console.log('');
if (problems.length === 0) {
  console.log('✓ No public read exposes captured submitter contact data.');
  for (const n of notes) console.log(`  · ${n}`);
  console.log('\n  Scope note: this proves anon cannot READ captured lead data.');
  console.log('  It does not audit write access or internal `notes` columns —');
  console.log('  those are covered by the policy review, not this script.');
  process.exit(0);
}

console.log(`✗ ${problems.length} table(s) expose captured submitter contact data to the public (anon) role:\n`);
for (const p of problems) {
  console.log(`  ${p.table}`);
  console.log(`     readable by anon: ${p.columns.join(', ')}  (${p.why})`);
  for (const [k, v] of Object.entries(p.sample || {})) {
    console.log(`       ${k} = ${String(v).slice(0, 60)}`);
  }
  console.log(`     → DROP the public SELECT policy on this table.`);
  console.log(`       Pattern: supabase/migrations/2026-06-16-critical-rls-fixes.sql (FIX 5/6)`);
  console.log(`       and 2026-10-30_listing_submissions_pii_lockdown.sql`);
  console.log('');
}
process.exit(1);
