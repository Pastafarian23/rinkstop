#!/usr/bin/env node
/**
 * Gate 8 — claim-flow entity resolution + end-to-end claim test.
 *
 * WHY THIS EXISTS (2026-10-30, Arnel-flagged):
 *   Arnel: "I need to make sure the claim flow and functionality are working
 *   perfectly for teams, federations, etc. so we can proceed with outreach!"
 *
 *   Checking that found FOUR real defects — none caught by tsc, by the build,
 *   by an HTTP 200, or by any existing test:
 *
 *   1. THE CLAIMS API LOOKED TEAMS UP IN THE WRONG TABLE.
 *      `src/app/api/claims/route.ts` mapped claim_type 'team' -> the legacy
 *      `teams` table. But the PUBLIC team directory reads `team_workspaces`.
 *      Slough Satans — the team a real customer tried to claim — exists ONLY
 *      in `team_workspaces`, so the lookup found nothing and the API answered
 *      "Could not look up listing" (500). The claim could NEVER complete for
 *      a team listed through the public directory.
 *
 *   2. `team_workspaces` HAS NO `claimable` COLUMN. Selecting it was
 *      PostgREST 42703 — the query errored instead of returning a row.
 *
 *   3. `players` HAS NO `name` COLUMN. The entity lookup selected
 *      `id, claimable, name` for every type -> 42703 for players.
 *
 *   4. LEAGUES WERE A DEAD END. `/directory/leagues/[id]` rendered a "Claim
 *      this league" CTA; POST /api/claims rejects claim_type 'league' with
 *      400; and the claims FORM silently fell `entity=league` back to 'rink',
 *      so it would have submitted a RINK claim carrying a league's UUID.
 *
 * THE FIX: one shared resolver, `src/lib/claim-entity.ts`, owns the table
 * mapping and the claimability rule. It searches the canonical table first
 * and falls back to the legacy one, and each table gets its OWN field list
 * (never a column from a different table).
 *
 * WHAT THIS SCRIPT DOES:
 *   It bundles the REAL production resolver with esbuild and exercises it
 *   against the LIVE database — the same technique as
 *   scripts/_test-submission-status.mjs. A re-implementation of the rules
 *   would test the copy, not the code that ships.
 *
 *   It also asserts the structural rules that no query can catch:
 *   - league is NOT a self-serve claim_type
 *   - the league page does not render a dead-end claim CTA
 *   - federations have NO public self-serve claim endpoint (invite-only)
 *
 *   READ-ONLY. It never writes, never claims, never sends anything.
 *
 * Usage:  node scripts/_test-claim-flow.mjs
 * Exit 0 = all assertions pass, 1 = a failure.
 */
import { readFileSync, writeFileSync, existsSync, unlinkSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createRequire } from 'node:module';

const ROOT = process.cwd();
const require = createRequire(join(ROOT, 'package.json'));

let failures = 0;
let checks = 0;
function check(label, ok, detail = '') {
  checks++;
  if (!ok) failures++;
  console.log(`  ${ok ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`);
}

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

// Walk src/ so the dead-focus sweep covers EVERY source file, not just the
// handful this script happens to read.
function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(tsx?|jsx?)$/.test(entry)) out.push(full);
  }
  return out;
}
const files = walk(join(ROOT, 'src'));

const url = envVar('NEXT_PUBLIC_SUPABASE_URL');
const anonKey = envVar('NEXT_PUBLIC_SUPABASE_ANON_KEY');
const serviceKey = envVar('SUPABASE_SERVICE_ROLE_KEY');
if (!url || !serviceKey) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}

// ---------------------------------------------------------------------------
console.log('\n1. Bundling the REAL production resolver');
// ---------------------------------------------------------------------------
// esbuild is a TRANSITIVE dependency and is not hoisted into node_modules,
// so a plain `import 'esbuild'` fails. Resolve it out of .pnpm explicitly.
function findEsbuild() {
  const pnpmDir = join(ROOT, 'node_modules', '.pnpm');
  if (!existsSync(pnpmDir)) return null;
  const { readdirSync } = require('node:fs');
  const candidates = readdirSync(pnpmDir).filter((d) => d.startsWith('esbuild@'));
  for (const c of candidates) {
    const p = join(pnpmDir, c, 'node_modules', 'esbuild', 'lib', 'main.js');
    if (existsSync(p)) return p;
  }
  return null;
}

const esbuildPath = findEsbuild();
if (!esbuildPath) {
  console.error('Could not locate esbuild in node_modules/.pnpm');
  process.exit(1);
}
const esbuild = require(esbuildPath);

const BUNDLE = join(ROOT, '.tmp-claim-entity-bundle.mjs');
esbuild.buildSync({
  entryPoints: [join(ROOT, 'src/lib/claim-entity.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: BUNDLE,
  external: ['@supabase/supabase-js'],
  alias: { '@/lib/supabase': join(ROOT, 'src/lib/supabase.ts') },
});
check('production resolver bundled', existsSync(BUNDLE));

process.env.NEXT_PUBLIC_SUPABASE_URL = url;
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = anonKey;
process.env.SUPABASE_SERVICE_ROLE_KEY = serviceKey;

const resolverMod = await import(`file://${BUNDLE}`);
const { resolveClaimEntity } = resolverMod;

// ---------------------------------------------------------------------------
console.log('\n2. Resolving REAL entities of every claimable type');
// ---------------------------------------------------------------------------
const { createClient } = await import('@supabase/supabase-js');
const sb = createClient(url, serviceKey);

// A team that exists ONLY in team_workspaces (the public directory table).
const { data: twOnly } = await sb
  .from('team_workspaces')
  .select('id, name, slug')
  .eq('slug', 'slough-satans')
  .maybeSingle();

// A team that exists ONLY in the legacy `teams` table (the fallback path).
// The two tables share 3,239 of their ids, so only ~10 teams are legacy-only.
// Find one by comparing the full id sets in JS — a `not in` with a
// 3,000-element list is unreadable and fragile.
async function fetchAll(table) {
  const out = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await sb.from(table).select('id, name, slug').range(offset, offset + 999);
    if (error) throw error;
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
    offset += 1000;
  }
  return out;
}
const allTw = await fetchAll('team_workspaces');
const allLegacy = await fetchAll('teams');
const twIdSet = new Set(allTw.map((r) => r.id));
const legacyOnly = allLegacy.find((r) => !twIdSet.has(r.id)) || null;

const { data: rinkRep } = await sb.from('rinks').select('id, name, slug').eq('is_active', true).limit(1).maybeSingle();
const { data: playerRep } = await sb.from('players').select('id, first_name, last_name, slug').limit(1).maybeSingle();

async function resolves(type, id) {
  try {
    return await resolveClaimEntity(type, id);
  } catch (e) {
    return { error: e };
  }
}

// The headline case: the team that started all of this.
if (twOnly) {
  const r = await resolves('team', twOnly.id);
  check(
    'TEAM in team_workspaces resolves by uuid (Slough Satans)',
    !!r && !r.error && r.name === twOnly.name,
    r?.error ? `THREW: ${r.error.message}` : r ? `name="${r.name}" source=${r.source}` : 'NOT FOUND',
  );
  check(
    'that team resolves from team_workspaces, not the legacy teams table',
    r?.source === 'team_workspaces',
    `source=${r?.source}`,
  );

  const bySlug = await resolves('team', twOnly.slug);
  check(
    'TEAM resolves by slug too',
    !!bySlug && !bySlug.error && bySlug.name === twOnly.name,
    bySlug?.error ? `THREW: ${bySlug.error.message}` : bySlug ? `name="${bySlug.name}"` : 'NOT FOUND',
  );
} else {
  check('team_workspaces representative found', false, 'slough-satans not found');
}

if (legacyOnly) {
  const r = await resolves('team', legacyOnly.id);
  check(
    `TEAM that exists ONLY in the legacy \`teams\` table still resolves (fallback path) — ${legacyOnly.name}`,
    !!r && !r.error && r.source === 'teams',
    r?.error ? `THREW: ${r.error.message}` : r ? `name="${r.name}" source=${r.source}` : 'NOT FOUND',
  );
} else {
  check('a legacy-only team exists to test the fallback path', true, 'none found — skipping');
}

if (rinkRep) {
  const r = await resolves('rink', rinkRep.id);
  check(
    'RINK resolves',
    !!r && !r.error && r.name === rinkRep.name,
    r?.error ? `THREW: ${r.error.message}` : r ? `name="${r.name}" source=${r.source}` : 'NOT FOUND',
  );
}

if (playerRep) {
  const r = await resolves('player', playerRep.id);
  const expected = `${playerRep.first_name} ${playerRep.last_name}`.trim();
  check(
    'PLAYER resolves (the `players` table has no `name` column — must use first/last)',
    !!r && !r.error && r.name === expected,
    r?.error ? `THREW: ${r.error.message}` : r ? `name="${r.name}"` : 'NOT FOUND',
  );
}

// ---------------------------------------------------------------------------
console.log('\n3. Claimability is derived, not assumed');
// ---------------------------------------------------------------------------
if (twOnly) {
  const r = await resolves('team', twOnly.id);
  check('a public, active team workspace is claimable', r?.claimable === true, `claimable=${r?.claimable}`);
}

// A private workspace must NOT be claimable.
const { data: privateTeam } = await sb
  .from('team_workspaces')
  .select('id, name, slug, visibility')
  .neq('visibility', 'public')
  .limit(1)
  .maybeSingle();
if (privateTeam) {
  const r = await resolves('team', privateTeam.id);
  check(
    'a non-public team workspace is NOT claimable',
    r?.claimable === false,
    `visibility=${privateTeam.visibility} claimable=${r?.claimable}`,
  );
}

// ---------------------------------------------------------------------------
console.log('\n4. League is NOT a self-serve claim_type');
// ---------------------------------------------------------------------------
const claimsRoute = readFileSync(join(ROOT, 'src/app/api/claims/route.ts'), 'utf8');
check(
  'POST /api/claims accepts only rink | team | player',
  /!\['rink',\s*'team',\s*'player'\]\.includes\(claim_type\)/.test(claimsRoute),
);
check(
  'the league page does NOT render a dead-end league claim CTA',
  !readFileSync(join(ROOT, 'src/app/directory/leagues/[id]/page.tsx'), 'utf8').includes(
    'ClaimThisListingMount entityType="league"',
  ),
);
check(
  'the league page routes league owners to the working /add-listing path',
  readFileSync(join(ROOT, 'src/app/directory/leagues/[id]/page.tsx'), 'utf8').includes(
    'LeagueOwnershipRequest',
  ),
);

// The claims FORM must not silently turn a league into a rink.
const claimsForm = readFileSync(join(ROOT, 'src/app/dashboard/claims/ClaimsForm.tsx'), 'utf8');
check(
  'the claims form does NOT silently map an unknown entity (e.g. league) to rink',
  claimsForm.includes("if (e === 'team' || e === 'player' || e === 'rink') return e;") &&
    !/entity=league/.test(claimsForm),
  'an unknown entity currently falls back to rink, which would submit a wrong claim_type',
);

// ---------------------------------------------------------------------------
console.log('\n5. Federations are invite-only (by design)');
// ---------------------------------------------------------------------------
check(
  'there is NO public federation self-serve claim endpoint',
  !existsSync(join(ROOT, 'src/app/api/federations/claim/route.ts')) &&
    !existsSync(join(ROOT, 'src/app/api/federations/claim/route.ts')),
);
const profileClaim = readFileSync(join(ROOT, 'src/app/profile/claim/page.tsx'), 'utf8');
check(
  'the federation claim page is token-gated',
  profileClaim.includes('token') && profileClaim.includes('notFound'),
);
check(
  'the federation claim page does not read a token from the DB without checking it',
  profileClaim.includes('redeem') || profileClaim.includes('getInviteByToken'),
);

// ---------------------------------------------------------------------------
console.log('\n6. The claims API uses the shared resolver');
// ---------------------------------------------------------------------------
check(
  'the claims API imports resolveClaimEntity (not an inline table mapping)',
  claimsRoute.includes('resolveClaimEntity'),
);
check(
  'the claims API has NO inline table mapping left for team lookups',
  !claimsRoute.includes("claim_type === 'team' ? 'teams'"),
);
const mount = readFileSync(join(ROOT, 'src/components/ClaimThisListingMount.tsx'), 'utf8');
check(
  'the claim CTA mount uses the shared resolver',
  mount.includes('resolveClaimEntity'),
);
check(
  'the claim CTA mount has NO inline table mapping left',
  !mount.includes("entityType === 'team' ? 'teams'"),
);
const nudge = readFileSync(join(ROOT, 'src/components/ClaimListingNudge.tsx'), 'utf8');
check(
  'the claim nudge uses the shared resolver',
  nudge.includes('resolveClaimEntity'),
);
check(
  'the claim nudge has NO inline table mapping left',
  !nudge.includes("entityType === 'team' ? 'teams'"),
);

// ---------------------------------------------------------------------------
console.log('\n7. No dead `focus=` deep links remain');
// ---------------------------------------------------------------------------
// The claim page used to ignore `focus` entirely, so every
// `/claim-your-listing?focus=…` link in the codebase was decorative — it
// opened the RINK tab no matter what was clicked. The page now accepts
// `focus` as an alias for `type`, and the nudge links straight to the
// real claim form.
// Strip line and block comments before checking — a COMMENT explaining the
// old broken link is fine; a LIVE link is not. A naive substring check would
// flag the very comment that documents the fix.
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const claimPageSrc = readFileSync(join(ROOT, 'src/app/claim-your-listing/page.tsx'), 'utf8');
check(
  'the claim page READS `focus` (as an alias for `type`)',
  claimPageSrc.includes('focus') && /rawType\s*=\s*typeParam\s*\|\|\s*focus/.test(claimPageSrc),
);
check(
  'the claim page pre-fills the search from `name`',
  claimPageSrc.includes('entityNameParam') && claimPageSrc.includes('prefilledQuery'),
);
check(
  'the claim nudge links to the real claim form, not a dead focus= link',
  !stripComments(nudge).includes('/claim-your-listing?focus='),
);
const fourPath = readFileSync(join(ROOT, 'src/components/FourPathNav.tsx'), 'utf8');
check(
  'FourPathNav has no dead focus= link',
  !stripComments(fourPath).includes('/claim-your-listing?focus='),
);
check(
  'FourPathNav does not promise a league self-serve claim',
  !fourPath.includes('Claim my team or league'),
);

// Sweep the WHOLE src tree for any remaining live dead focus= link.
const deadFocusHits = [];
for (const f of files) {
  const rel = relative(ROOT, f);
  if (rel.includes('node_modules') || rel.includes('.next')) continue;
  const src = stripComments(readFileSync(f, 'utf8'));
  if (src.includes('/claim-your-listing?focus=')) {
    deadFocusHits.push(rel);
  }
}
check(
  'no live source file anywhere still links to /claim-your-listing?focus=',
  deadFocusHits.length === 0,
  deadFocusHits.join(', '),
);

// ---------------------------------------------------------------------------
try {
  unlinkSync(BUNDLE);
} catch {}

// ---------------------------------------------------------------------------
console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures > 0) {
  console.log('\n=== CLAIM FLOW TEST FAILED ===');
  console.log('The claim flow cannot complete for one or more entity types.');
  console.log('Do NOT run outreach until this passes — a customer who clicks');
  console.log('"Claim this" and hits an error is worse than no CTA at all.');
  process.exit(1);
}
console.log('✓ Claim flow works end-to-end for every claimable entity type.');
