#!/usr/bin/env node
/**
 * End-to-end test for the listing-submission status flow.
 *
 * WHY THIS EXISTS (2026-10-30):
 *   The submission → review → live-listing path has broken independently
 *   three times:
 *     1. the claim search (team_workspaces column rename)
 *     2. the submission email (no status link — a dead end)
 *     3. the PII boundary (anon could read every submission)
 *   A unit test would test a copy. This exercises the REAL production
 *   modules against the LIVE database, the same way
 *   scripts/_test-federation-claim-flow.mjs does.
 *
 * WHAT IT CHECKS:
 *   - a valid token resolves to the right submission
 *   - an invalid/short token returns null (no existence oracle)
 *   - the resolved view NEVER contains email / notes / outcome_notes
 *   - an approved submission resolves its live URL and claim URL
 *   - the anon Supabase role still CANNOT read listing_submissions
 *   - a newly minted token resolves and is unique
 *
 * Usage:  node scripts/_test-submission-status.mjs
 * Exit 0 = all assertions pass, 1 = a failure.
 */
import { readFileSync, readdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const ROOT = process.cwd();

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
  console.error('Missing Supabase env vars');
  process.exit(1);
}

const admin = createClient(url, serviceKey);
const anon = createClient(url, anonKey);

// The bundled module reads these from process.env — make sure they are set
// with the SAME names the real src/lib/supabase.ts uses. Without this the
// stub resolves to 'placeholder.invalid' and every lookup fails with
// ENOTFOUND — which looks like a broken module rather than a broken stub.
process.env.NEXT_PUBLIC_SUPABASE_URL = url;
process.env.SUPABASE_SERVICE_ROLE_KEY = serviceKey;
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = anonKey;

let pass = 0;
let fail = 0;
const failures = [];

function check(name, condition, detail = '') {
  if (condition) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

// ---------------------------------------------------------------------------
// Load the REAL production module. It imports '@/lib/supabase' which needs
// the service-role env vars, so we bundle it with esbuild and run it in
// process — the same trick as scripts/_test-federation-claim-flow.mjs.
//
// esbuild is a transitive dep (vite/vitest) and is NOT hoisted, so
// `import 'esbuild'` fails. Resolve it out of node_modules/.pnpm.
// ---------------------------------------------------------------------------
async function loadStatusModule() {
  const esbuildPath = readdirSync(join(ROOT, 'node_modules', '.pnpm'))
    .filter((d) => d.startsWith('esbuild@'))
    .map((d) => join(ROOT, 'node_modules', '.pnpm', d, 'node_modules', 'esbuild', 'lib', 'main.js'))
    .find((p) => existsSync(p));
  if (!esbuildPath) throw new Error('esbuild not found in node_modules/.pnpm');
  const esbuild = await import(pathToFileURL(esbuildPath).href);

  // Stub @/lib/supabase so we don't compile the whole Next app.
  const supabaseStub = `
import { createClient } from '@supabase/supabase-js';
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);
export const supabase = supabaseAdmin;
export const supabaseRead = supabaseAdmin;
`;
  const stubPath = join(ROOT, 'scripts', '.tmp-submission-status-supabase-stub.ts');
  writeFileSync(stubPath, supabaseStub);

  const entry = join(ROOT, 'scripts', '.tmp-submission-status-entry.ts');
  const outfile = join(ROOT, '.tmp-submission-status-bundle.mjs');
  writeFileSync(
    entry,
    `export { getSubmissionStatusByToken, resolveLiveUrl, ageLabel, REVIEW_SLA_DAYS } from '@/lib/submission-status';`
  );

  await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile,
    external: ['@supabase/supabase-js'],
    alias: { '@': join(ROOT, 'src') },
    logLevel: 'silent',
  });

  const mod = await import(`${pathToFileURL(outfile).href}?t=${Date.now()}`);
  return mod;
}

// 2026-10-30: the three temp files above (stub, entry, bundle) were left
// behind in the working tree after every run, which blocked the pre-push
// guard with "uncommitted changes present" and littered the repo root.
// Clean them up. The script ends with process.exit(), so this has to be
// explicit rather than a finally block.
const TEMP_FILES = [
  join(ROOT, 'scripts', '.tmp-submission-status-supabase-stub.ts'),
  join(ROOT, 'scripts', '.tmp-submission-status-entry.ts'),
  join(ROOT, '.tmp-submission-status-bundle.mjs'),
];
function cleanupTempFiles() {
  for (const f of TEMP_FILES) {
    try {
      rmSync(f, { force: true });
    } catch {
      /* best effort */
    }
  }
}
process.on('exit', cleanupTempFiles);

console.log('Submission status flow — live end-to-end test\n');

// ---------------------------------------------------------------------------
console.log('1. Token resolution');
// ---------------------------------------------------------------------------
const statusMod = await loadStatusModule();

const { data: submissions, error: subErr } = await admin
  .from('listing_submissions')
  .select('id, name, listing_type, status, public_token, public_token_expires_at')
  .order('created_at');
if (subErr) {
  console.error('Could not read listing_submissions:', subErr.message);
  process.exit(1);
}

check('listing_submissions has rows to test', (submissions || []).length > 0, `${(submissions || []).length} rows`);

for (const row of submissions || []) {
  check(
    `row "${row.name.slice(0, 30)}" has a public_token`,
    !!row.public_token && row.public_token.length >= 40,
    `len=${row.public_token?.length}`,
  );
  check(
    `row "${row.name.slice(0, 30)}" token is URL-safe`,
    !!row.public_token && /^[A-Za-z0-9_-]+$/.test(row.public_token),
  );
}

// ---------------------------------------------------------------------------
console.log('\n2. Valid token resolves');
// ---------------------------------------------------------------------------
const target = (submissions || []).find((s) => s.status === 'approved' && s.public_token);
if (!target) {
  console.log('  ! no approved submission with a token to test against');
} else {
  const view = await statusMod.getSubmissionStatusByToken(target.public_token);
  check('valid token returns a view', !!view);
  check('view name matches the submission', view?.name === target.name, `${view?.name}`);
  check('view status matches', view?.status === target.status, `${view?.status}`);
  check('approved submission has a live_url', !!view?.live_url, `${view?.live_url}`);
  check('approved submission has a claim_url', !!view?.claim_url, `${view?.claim_url}`);

  // 2026-10-30 (Arnel-flagged): the claim_url used to point at
  // `/claim-your-listing?focus=team&id=…`, but the claim page NEVER READ
  // `focus` or `id` — so the "Claim and edit it" button dropped the submitter
  // on a blank search page with no reference to their listing. It also passed
  // the SLUG as the display name, so the form showed "slough-satans" instead
  // of "Slough Satans".
  //
  // The real claim form is /dashboard/claims?intent=claim&entity=…&id=…&name=…
  // and it DOES pre-fill from those params. Assert that, and assert the name
  // is a human-readable display name (not a slug).
  if (view?.claim_url) {
    check(
      'claim_url points at the real claim form (/dashboard/claims?intent=claim)',
      view.claim_url.startsWith('/dashboard/claims?intent=claim'),
      `${view.claim_url}`,
    );
    check(
      'claim_url carries entity, id and name so the form pre-fills',
      view.claim_url.includes('&entity=') &&
        view.claim_url.includes('&id=') &&
        view.claim_url.includes('&name='),
      `${view.claim_url}`,
    );
    const nameParam = decodeURIComponent(view.claim_url.match(/&name=([^&]*)/)?.[1] || '');
    check(
      'claim_url name is a readable display name, not a slug',
      !!nameParam && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(nameParam),
      `${nameParam}`,
    );
    check(
      'claim_url does NOT use the dead focus= param',
      !view.claim_url.includes('focus='),
      `${view.claim_url}`,
    );
  }
  check('age_label is populated', !!view?.age_label, `${view?.age_label}`);
}

// ---------------------------------------------------------------------------
console.log('\n3. Invalid tokens return null (no existence oracle)');
// ---------------------------------------------------------------------------
check('empty token -> null', (await statusMod.getSubmissionStatusByToken('')) === null);
check('short token -> null', (await statusMod.getSubmissionStatusByToken('abc')) === null);
check(
  'random 43-char token -> null',
  (await statusMod.getSubmissionStatusByToken(randomBytes(32).toString('base64url'))) === null,
);

// ---------------------------------------------------------------------------
console.log('\n4. The view NEVER leaks PII');
// ---------------------------------------------------------------------------
if (target) {
  const view = await statusMod.getSubmissionStatusByToken(target.public_token);
  const keys = Object.keys(view || {});
  const forbidden = ['email', 'notes', 'outcome_notes', 'reviewed_by', 'contacted_by'];
  for (const f of forbidden) {
    check(`view does not expose "${f}"`, !keys.includes(f), `keys=${keys.join(',')}`);
  }
  const serialized = JSON.stringify(view || {});
  check('serialized view contains no @ sign', !serialized.includes('@'), serialized.slice(0, 120));
  check(
    'serialized view contains no "notes"',
    !serialized.includes('notes'),
    serialized.slice(0, 120),
  );
}

// ---------------------------------------------------------------------------
console.log('\n5. A newly minted token resolves and is unique');
// ---------------------------------------------------------------------------
const newToken = randomBytes(32).toString('base64url');
const { error: insertErr } = await admin
  .from('listing_submissions')
  .insert({
    listing_type: 'team',
    name: 'STATUS FLOW TEST — delete me',
    email: 'status-flow-test@test.invalid',
    status: 'pending',
    public_token: newToken,
    public_token_expires_at: new Date(Date.now() + 86_400_000).toISOString(),
  });
check('test row inserted', !insertErr, insertErr?.message);

if (!insertErr) {
  const newView = await statusMod.getSubmissionStatusByToken(newToken);
  check('new token resolves', !!newView);
  check('new row shows pending', newView?.status === 'pending', `${newView?.status}`);
  check('new row has no live_url yet', !newView?.live_url);
  check('new row is not overdue (fresh)', newView?.overdue === false);

  // Clean up.
  await admin.from('listing_submissions').delete().eq('email', 'status-flow-test@test.invalid');
  const { data: leftover } = await admin
    .from('listing_submissions')
    .select('id')
    .eq('email', 'status-flow-test@test.invalid');
  check('test row cleaned up', (leftover || []).length === 0);
}

// ---------------------------------------------------------------------------
console.log('\n6. The anon role still CANNOT read listing_submissions');
// ---------------------------------------------------------------------------
const { data: anonRows, error: anonErr } = await anon
  .from('listing_submissions')
  .select('email, name');
check('anon select returns no error', !anonErr, anonErr?.message);
check('anon select returns zero rows', (anonRows || []).length === 0, `${(anonRows || []).length} rows`);

const { error: anonInsertErr } = await anon.from('listing_submissions').insert({
  listing_type: 'team',
  name: 'ANON INSERT TEST — delete me',
  email: 'anon-insert-test@test.invalid',
});
check('anon insert is still allowed (public form works)', !anonInsertErr, anonInsertErr?.message);
if (!anonInsertErr) {
  await admin.from('listing_submissions').delete().eq('email', 'anon-insert-test@test.invalid');
}

// ---------------------------------------------------------------------------
console.log(`\n${pass} passed, ${fail} failed`);
if (fail) {
  console.log('\nFailures:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log('All assertions passed.');
process.exit(0);
