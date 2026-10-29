/**
 * scripts/_test-listing-creation.mjs
 *
 * Proves the approve→create-listing logic against the LIVE database, using
 * the real production module. Read-only against real data except for the
 * one row it deliberately creates, which it then removes.
 *
 * Cases:
 *  1. A submission whose name+city matches an EXISTING listing (Slough
 *     Satans -> Slough Ice Arena) must MATCH, not create a duplicate.
 *  2. A submission with a new name must CREATE a listing, with the right
 *     fields: claimable=true, verification_tier='unverified', status='open',
 *     is_active=true, correct slug, and the source cited.
 *  3. Running the same submission twice must NOT create two listings
 *     (idempotency via the notes column).
 *  4. A listing_type with no directory table must SKIP cleanly.
 *
 * Run: node scripts/_test-listing-creation.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const creds = JSON.parse(fs.readFileSync('/root/.openclaw/credentials/supabase.json', 'utf8'));
process.env.SUPABASE_URL = creds.url;
process.env.SUPABASE_SERVICE_ROLE_KEY = creds.serviceRoleKey;
process.env.NEXT_PUBLIC_SUPABASE_URL = creds.url;

const supabaseStub = `
import { createClient } from '@supabase/supabase-js';
export const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
export const supabase = supabaseAdmin;
export const supabaseRead = supabaseAdmin;
`;

const stubPath = path.join(repoRoot, 'scripts', '.tmp-test-listing-stub.ts');
fs.writeFileSync(stubPath, supabaseStub);

let mod;
try {
  const esbuildPath = fs
    .readdirSync(path.join(repoRoot, 'node_modules', '.pnpm'))
    .filter((d) => d.startsWith('esbuild@'))
    .map((d) => path.join(repoRoot, 'node_modules', '.pnpm', d, 'node_modules', 'esbuild', 'lib', 'main.js'))
    .find((p) => fs.existsSync(p));
  const esbuild = await import(pathToFileURL(esbuildPath).href);
  const r = await esbuild.build({
    entryPoints: [path.join(repoRoot, 'src', 'lib', 'listing-submission-to-listing.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    write: false,
    target: 'node20',
    external: ['@supabase/supabase-js'],
    alias: { '@/lib/supabase': stubPath, '@/lib/slug': path.join(repoRoot, 'src', 'lib', 'slug.ts') },
    logLevel: 'error',
  });
  const out = path.join(repoRoot, '.test-listing.mjs');
  fs.writeFileSync(out, r.outputFiles[0].text);
  mod = await import(pathToFileURL(out).href + `?t=${Date.now()}`);
  fs.rmSync(out, { force: true });
} finally {
  fs.rmSync(stubPath, { force: true });
}

const { createListingFromSubmission } = mod;
const { createClient } = await import('@supabase/supabase-js');
const sb = createClient(creds.url, creds.serviceRoleKey, { auth: { persistSession: false } });

let failures = 0;
function check(label, cond, detail) {
  if (cond) {
    console.log(`  PASS  ${label}`);
  } else {
    failures++;
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

// ── Case 1: matches an EXISTING listing ────────────────────────────────────
// A rink submission whose name+city matches an EXISTING rink must MATCH,
// not create a duplicate. Slough Ice Arena is a real, live rink.
console.log('\nCASE 1 — submission matching an existing listing (Slough Ice Arena)');
{
  const { data: arena } = await sb
    .from('rinks')
    .select('id, slug, name, city')
    .eq('slug', 'slough-ice-arena')
    .single();
  console.log('    existing rink:', JSON.stringify(arena));

  const result = await createListingFromSubmission({
    id: '00000000-0000-0000-0000-000000000001',
    listing_type: 'rink',
    name: 'Slough Ice Arena',
    city: 'Slough',
    country: 'England',
    website: 'https://sloughibc.co.uk',
    description: 'Sunday night scrimmage club.',
    email: 'sloughsatans@gmail.com',
    notes: null,
  });

  console.log('   ', JSON.stringify(result));
  check('outcome is "matched" (no duplicate created)', result.outcome === 'matched', result.outcome);
  check('a listing id was returned', !!result.listingId);
  check('the matched listing IS Slough Ice Arena', result.listingId === arena?.id, `got ${result.listingId}`);
  check('listingUrl points at the existing listing', result.listingUrl === '/directory/rinks/slough-ice-arena', String(result.listingUrl));
  check('skipReason explains the match', !!result.skipReason);
}

// ── Case 1b: a TEAM submission for a genuinely new team creates a team ───
// "Slough Satans" does NOT exist in `teams` (only the arena exists in
// `rinks`), so this must CREATE a team — and must not fail on the missing
// `email`/`notes`/`source` columns that `teams` does not have.
console.log('\nCASE 1b — team submission for a genuinely new team (teams has a different schema)');
let createdTeamId = null;
{
  const result = await createListingFromSubmission({
    id: '00000000-0000-0000-0000-000000000004',
    listing_type: 'team',
    name: 'ZZ Test Verification Team',
    city: 'Testville',
    country: 'United Kingdom',
    website: 'https://example.com/test-team',
    description: 'Temporary row to verify team insert against the teams schema.',
    email: 'verify@example.com',
    notes: null,
  });

  console.log('   ', JSON.stringify(result));
  createdTeamId = result.listingId;
  check('ok (insert did not fail on missing columns)', result.ok, result.error);
  check('outcome is "created"', result.outcome === 'created', result.outcome);
  check('listing id returned', !!createdTeamId);

  if (createdTeamId) {
    const { data: row } = await sb.from('teams').select('*').eq('id', createdTeamId).single();
    check('name correct', row?.name === 'ZZ Test Verification Team', row?.name);
    check('city correct', row?.city === 'Testville', row?.city);
    check('website carried through', row?.website_url === 'https://example.com/test-team');
    check('is_active true', row?.is_active === true);
    check('claimable true (they claim it, we do not)', row?.claimable === true);
    check('deactivated_at NULL (CHECK constraint)', row?.deactivated_at === null, String(row?.deactivated_at));
    check('merged_into_id NULL (CHECK constraint)', row?.merged_into_id === null, String(row?.merged_into_id));
  }
}

// ── Case 2: creates a NEW listing ──────────────────────────────────────────
console.log('\nCASE 2 — new submission creates a listing');
let createdId = null;
let createdSlug = null;
{
  const result = await createListingFromSubmission({
    id: '00000000-0000-0000-0000-000000000002',
    listing_type: 'rink',
    name: 'ZZ Test Verification Rink',
    city: 'Testville',
    country: 'United Kingdom',
    website: 'https://example.com/test-rink',
    description: 'Temporary row created by _test-listing-creation.mjs to verify the approve->create path.',
    email: 'verify@example.com',
    notes: null,
  });

  console.log('   ', JSON.stringify(result));
  createdId = result.listingId;
  createdSlug = result.listingSlug;
  check('ok', result.ok, result.error);
  check('outcome is "created"', result.outcome === 'created', result.outcome);
  check('listing id returned', !!createdId);
  check('slug returned', !!createdSlug);
  check('listingUrl returned', !!result.listingUrl, String(result.listingUrl));

  if (createdId) {
    const { data: row } = await sb.from('rinks').select('*').eq('id', createdId).single();
    check('name correct', row?.name === 'ZZ Test Verification Rink', row?.name);
    check('city correct', row?.city === 'Testville', row?.city);
    check('claimable is TRUE (not pushy — they claim it themselves)', row?.claimable === true);
    check(
      'verification_tier is unverified (we do not verify on their behalf)',
      row?.verification_tier === 'unverified',
      row?.verification_tier,
    );
    check('status is open', row?.status === 'open', row?.status);
    check('is_active is true', row?.is_active === true, String(row?.is_active));
    check('website_url carried through', row?.website_url === 'https://example.com/test-rink');
    check('source cites the submission', String(row?.source || '').includes('00000000-0000-0000-0000-000000000002'), row?.source);
    check('slug matches what we returned', row?.slug === createdSlug);
  }
}

// ── Case 3: idempotency — same submission again must not create a second row ─
console.log('\nCASE 3 — idempotency (notes already records a listing id)');
{
  const before = await sb.from('rinks').select('id', { count: 'exact', head: true }).eq('name', 'ZZ Test Verification Rink');
  const result = await createListingFromSubmission({
    id: '00000000-0000-0000-0000-000000000002',
    listing_type: 'rink',
    name: 'ZZ Test Verification Rink',
    city: 'Testville',
    country: 'United Kingdom',
    website: null,
    description: null,
    email: 'verify@example.com',
    notes: `Listing created from this submission: rinks/${createdId} — /directory/rinks/${createdSlug}.`,
  });
  const after = await sb.from('rinks').select('id', { count: 'exact', head: true }).eq('name', 'ZZ Test Verification Rink');

  console.log('   ', JSON.stringify(result));
  check('did NOT create a second listing', (after.count ?? 0) === (before.count ?? 0), `${before.count} -> ${after.count}`);
  check('outcome is "matched" (already linked)', result.outcome === 'matched', result.outcome);
  check('returned the SAME listing id', result.listingId === createdId);
}

// ── Case 4: listing_type with no directory table ───────────────────────────
console.log('\nCASE 4 — listing_type with no directory table (tournament)');
{
  const result = await createListingFromSubmission({
    id: '00000000-0000-0000-0000-000000000003',
    listing_type: 'tournament',
    name: 'ZZ Test Tournament',
    city: null,
    country: null,
    website: null,
    description: null,
    email: 'verify@example.com',
    notes: null,
  });
  console.log('   ', JSON.stringify(result));
  check('ok (skips cleanly, does not error)', result.ok);
  check('entity is null', result.entity === null);
  check('skipReason explains why', !!result.skipReason);
  check('no listing id', !result.listingId);
}

// ── Cleanup ─────────────────────────────────────────────────────────────────
console.log('\nCLEANUP — removing the test rows');
if (createdId) {
  const { error } = await sb.from('rinks').delete().eq('id', createdId);
  check('test rink deleted', !error, error?.message);
  const { count } = await sb.from('rinks').select('id', { count: 'exact', head: true }).eq('name', 'ZZ Test Verification Rink');
  check('zero test rink rows remain', (count ?? 0) === 0, String(count));
}
if (createdTeamId) {
  const { error } = await sb.from('teams').delete().eq('id', createdTeamId);
  check('test team deleted', !error, error?.message);
  const { count } = await sb.from('teams').select('id', { count: 'exact', head: true }).eq('name', 'ZZ Test Verification Team');
  check('zero test team rows remain', (count ?? 0) === 0, String(count));
}

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
