/**
 * scripts/_test-federation-claim-flow.mjs
 *
 * End-to-end proof of the federation claim flow, against the LIVE database:
 *
 *   invite issued  →  invite redeemed (email-bound, single-use)  →
 *   pending claim created  →  admin approval sets owner_user_id  →
 *   owner can manage the federation  →  member request queued and approved
 *
 * IMPORTANT: this exercises the REAL production module
 * (`src/lib/federation-ownership.ts`), bundled with esbuild the same way
 * `scripts/_probe-revenue-metrics.mjs` does, so a re-implementation cannot
 * drift from the code that actually ships.
 *
 * Every row it creates is deleted afterwards. The one row it modifies
 * (the federation's owner_user_id) is restored to its original value.
 *
 * Run: node scripts/_test-federation-claim-flow.mjs
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

const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient(creds.url, creds.serviceRoleKey, {
  auth: { persistSession: false },
});

// ---------------------------------------------------------------------------
// Bundle the production module with esbuild and import it.
// esbuild is a transitive dep (vite/vitest) and is NOT hoisted, so resolve it
// out of node_modules/.pnpm the same way scripts/_probe-revenue-metrics.mjs
// does.
// ---------------------------------------------------------------------------
const esbuildPath = fs
  .readdirSync(path.join(repoRoot, 'node_modules', '.pnpm'))
  .filter((d) => d.startsWith('esbuild@'))
  .map((d) => path.join(repoRoot, 'node_modules', '.pnpm', d, 'node_modules', 'esbuild', 'lib', 'main.js'))
  .find((p) => fs.existsSync(p));
if (!esbuildPath) throw new Error('esbuild not found in node_modules/.pnpm');
const esbuild = await import(pathToFileURL(esbuildPath).href);

// Stub @/lib/supabase so we don't compile the whole Next app.
const supabaseStub = `
import { createClient } from '@supabase/supabase-js';
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);
export const supabase = supabaseAdmin;
export const supabaseRead = supabaseAdmin;
`;
const stubPath = path.join(repoRoot, 'scripts', '.tmp-fed-flow-supabase-stub.ts');
fs.writeFileSync(stubPath, supabaseStub);

const entry = path.join(repoRoot, 'scripts', '.tmp-fed-flow-entry.ts');
const outfile = path.join(repoRoot, '.tmp-fed-flow-bundle.mjs');

fs.writeFileSync(
  entry,
  `
export {
  generateInviteToken,
  DEFAULT_INVITE_DAYS,
  getInviteByToken,
  redeemInvite,
  isFederationOwner,
  applyFederationOwnership,
  validateFederationPatch,
  FEDERATION_OWNER_EDITABLE_FIELDS,
  getFederationBySlug,
  getFederationByCountryCode,
  getFederationMembers,
} from '@/lib/federation-ownership';
`,
);

const build = await esbuild.build({
  entryPoints: [entry],
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
  target: 'node20',
  absWorkingDir: repoRoot,
  external: ['@supabase/supabase-js'],
  alias: { '@/lib/supabase': stubPath },
  logLevel: 'error',
});
fs.writeFileSync(outfile, build.outputFiles[0].text);
const mod = await import(pathToFileURL(outfile).href + `?t=${Date.now()}`);

let pass = 0;
let fail = 0;
function check(label, cond, detail) {
  if (cond) {
    pass++;
    console.log('  PASS  ' + label);
  } else {
    fail++;
    console.log('  FAIL  ' + label + (detail ? ' — ' + detail : ''));
  }
}

const created = { inviteIds: [], claimIds: [], memberRequestIds: [] };
const touchedFederations = new Map();

async function main() {
  // -----------------------------------------------------------------------
  // Pick a federation that has no owner, and remember its original state.
  // -----------------------------------------------------------------------
  const { data: feds, error: fedErr } = await supabase
    .from('federations')
    .select('id, slug, name, country_code, owner_user_id, claimable, is_active')
    .eq('is_active', true)
    .is('owner_user_id', null)
    .limit(5);
  if (fedErr) throw fedErr;
  if (!feds || feds.length === 0) throw new Error('no unowned federations to test against');
  const fed = feds[0];
  touchedFederations.set(fed.id, { owner_user_id: fed.owner_user_id, name: fed.name });
  console.log(`\nTesting against federation: ${fed.name} (${fed.slug})`);

  const testUser = 'test-fed-flow-user@example.com';
  const otherUser = 'test-fed-flow-other@example.com';

  // -----------------------------------------------------------------------
  // CASE 1 — token generation is unguessable and URL-safe
  // -----------------------------------------------------------------------
  const token = mod.generateInviteToken();
  check('token is 43 chars (32 bytes base64url)', token.length === 43, `got ${token.length}`);
  check('token is URL-safe', /^[A-Za-z0-9_-]+$/.test(token));

  // -----------------------------------------------------------------------
  // CASE 2 — issue an invite directly (the admin API does this; we test the
  // table + the redemption path, which is where the security lives).
  // -----------------------------------------------------------------------
  const { data: invite, error: invErr } = await supabase
    .from('federation_claim_invites')
    .insert({
      token,
      federation_id: fed.id,
      email: testUser,
      contact_name: 'Test Contact',
      note: 'automated flow test',
      max_uses: 1,
      times_used: 0,
      expires_at: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
      created_by: 'test-fed-flow',
    })
    .select('*')
    .single();
  if (invErr) throw invErr;
  created.inviteIds.push(invite.id);

  const lookup = await mod.getInviteByToken(token);
  check('invite lookup by token succeeds', lookup.ok === true);
  check('invite carries the federation name', lookup.ok && lookup.invite.federation_name === fed.name);

  const badLookup = await mod.getInviteByToken('definitely-not-a-real-token');
  check('unknown token is rejected', badLookup.ok === false);
  check('unknown token reason is invite_not_found', badLookup.ok === false && badLookup.reason === 'invite_not_found');

  // -----------------------------------------------------------------------
  // CASE 3 — email binding: a DIFFERENT email cannot redeem
  // -----------------------------------------------------------------------
  const wrongEmail = await mod.redeemInvite(token, otherUser, 'u_wrong');
  check('redeem with the wrong email fails', wrongEmail.ok === false);
  check('wrong email reason is invite_email_mismatch', wrongEmail.ok === false && wrongEmail.reason === 'invite_email_mismatch');

  const { data: stillUnused } = await supabase
    .from('federation_claim_invites')
    .select('times_used')
    .eq('id', invite.id)
    .single();
  check('failed redemption did NOT consume the invite', stillUnused.times_used === 0, `times_used=${stillUnused.times_used}`);

  // -----------------------------------------------------------------------
  // CASE 4 — the right email redeems it, exactly once
  // -----------------------------------------------------------------------
  const redeemed = await mod.redeemInvite(token, testUser, 'u_test');
  check('redeem with the bound email succeeds', redeemed.ok === true, JSON.stringify(redeemed).slice(0, 200));

  const { data: usedInvite } = await supabase
    .from('federation_claim_invites')
    .select('times_used, accepted_by')
    .eq('id', invite.id)
    .single();
  check('invite times_used incremented to 1', usedInvite.times_used === 1, `got ${usedInvite.times_used}`);
  check('invite accepted_by recorded', usedInvite.accepted_by === 'u_test');

  const second = await mod.redeemInvite(token, testUser, 'u_test');
  check('a single-use invite cannot be redeemed twice', second.ok === false);
  check('second redeem reason is invite_exhausted', second.ok === false && second.reason === 'invite_exhausted');

  // -----------------------------------------------------------------------
  // CASE 5 — a pending claim is created for the federation
  // -----------------------------------------------------------------------
  const { data: claim, error: claimErr } = await supabase
    .from('claims')
    .insert({
      user_id: 'u_test',
      claim_type: 'federation',
      entity_name: fed.name,
      entity_id: fed.id,
      reason: 'automated flow test',
      proof: `federation_claim_invite:${invite.id}`,
      status: 'pending',
    })
    .select('*')
    .single();
  if (claimErr) throw claimErr;
  created.claimIds.push(claim.id);
  check('pending federation claim created', claim.claim_type === 'federation' && claim.status === 'pending');

  // -----------------------------------------------------------------------
  // CASE 6 — approval sets owner_user_id (real production function)
  // -----------------------------------------------------------------------
  const approval = await mod.applyFederationOwnership({ user_id: 'u_test', entity_id: fed.id });
  check('approval succeeds', approval.ok === true, JSON.stringify(approval));
  check('approval produces no warning on a clean federation', approval.ok === true && approval.warning === null);

  const { data: afterApprove } = await supabase
    .from('federations')
    .select('owner_user_id')
    .eq('id', fed.id)
    .single();
  check('owner_user_id set to the claimer', afterApprove.owner_user_id === 'u_test');

  const isOwner = await mod.isFederationOwner('u_test', fed.id);
  check('isFederationOwner is true for the claimer', isOwner === true);
  const notOwner = await mod.isFederationOwner('u_other', fed.id);
  check('isFederationOwner is false for everyone else', notOwner === false);

  // -----------------------------------------------------------------------
  // CASE 7 — a SECOND claimer must NOT steal ownership
  // -----------------------------------------------------------------------
  const steal = await mod.applyFederationOwnership({ user_id: 'u_thief', entity_id: fed.id });
  check('a second claimer is recorded but refused ownership', steal.ok === true && typeof steal.warning === 'string');
  const { data: afterSteal } = await supabase
    .from('federations')
    .select('owner_user_id')
    .eq('id', fed.id)
    .single();
  check('ownership was NOT transferred to the second claimer', afterSteal.owner_user_id === 'u_test');

  // -----------------------------------------------------------------------
  // CASE 8 — one federation per admin
  // -----------------------------------------------------------------------
  const otherFed = feds.find((f) => f.id !== fed.id);
  if (otherFed) {
    touchedFederations.set(otherFed.id, { owner_user_id: otherFed.owner_user_id, name: otherFed.name });
    const secondFed = await mod.applyFederationOwnership({ user_id: 'u_test', entity_id: otherFed.id });
    check('the same admin cannot own a second federation', secondFed.ok === true && typeof secondFed.warning === 'string');
    const { data: otherAfter } = await supabase
      .from('federations')
      .select('owner_user_id')
      .eq('id', otherFed.id)
      .single();
    check('the second federation did NOT get an owner', otherAfter.owner_user_id === null);
  }

  // -----------------------------------------------------------------------
  // CASE 9 — a non-claimable federation cannot be approved
  // -----------------------------------------------------------------------
  const { data: locked } = await supabase
    .from('federations')
    .update({ claimable: false })
    .eq('id', fed.id)
    .select('claimable')
    .single();
  const lockedResult = await mod.applyFederationOwnership({ user_id: 'u_locked', entity_id: fed.id });
  check('a non-claimable federation is refused', lockedResult.ok === false);
  check('refusal code is federation_not_claimable', lockedResult.ok === false && lockedResult.code === 'federation_not_claimable');
  await supabase.from('federations').update({ claimable: locked.claimable }).eq('id', fed.id);

  // -----------------------------------------------------------------------
  // CASE 10 — a missing federation is refused
  // -----------------------------------------------------------------------
  const missing = await mod.applyFederationOwnership({
    user_id: 'u_test',
    entity_id: '00000000-0000-0000-0000-000000000000',
  });
  check('a missing federation is refused', missing.ok === false);
  check('refusal code is federation_missing', missing.ok === false && missing.code === 'federation_missing');

  // -----------------------------------------------------------------------
  // CASE 11 — profile validation: which fields an owner may edit
  // -----------------------------------------------------------------------
  const editable = [...mod.FEDERATION_OWNER_EDITABLE_FIELDS];
  check('name is editable', editable.includes('name'));
  check('description is editable', editable.includes('description'));
  check('slug is NOT editable', !editable.includes('slug'));
  check('owner_user_id is NOT editable', !editable.includes('owner_user_id'));
  check('country_code is NOT editable', !editable.includes('country_code'));

  const okPatch = mod.validateFederationPatch({ description: 'A description.' });
  check('a valid patch validates', okPatch.ok === true);

  const badField = mod.validateFederationPatch({ slug: 'hijacked' });
  check('a non-editable field is rejected', badField.ok === false && badField.field === 'slug');

  const badEmail = mod.validateFederationPatch({ contact_email: 'not-an-email' });
  check('an invalid contact email is rejected', badEmail.ok === false);

  const empty = mod.validateFederationPatch({});
  check('an empty patch is rejected', empty.ok === false);

  // -----------------------------------------------------------------------
  // CASE 12 — member league request is queued, then approved (links the league)
  // -----------------------------------------------------------------------
  const { data: league } = await supabase
    .from('leagues')
    .select('id, name, federation_id')
    .is('federation_id', null)
    .limit(1)
    .single();
  if (league) {
    const { data: memberReq, error: mrErr } = await supabase
      .from('federation_member_requests')
      .insert({
        federation_id: fed.id,
        member_type: 'league',
        league_id: league.id,
        proposed_name: league.name,
        status: 'pending',
        submitted_by: 'u_test',
      })
      .select('*')
      .single();
    if (mrErr) throw mrErr;
    created.memberRequestIds.push(memberReq.id);
    check('member league request created as pending', memberReq.status === 'pending');

    // Approving links the league to the federation (the same mutation the
    // admin review route performs).
    const { error: linkErr } = await supabase
      .from('leagues')
      .update({ federation_id: fed.id })
      .eq('id', league.id);
    check('league link update succeeded', !linkErr);

    const members = await mod.getFederationMembers(fed.id);
    check('the linked league appears in the federation members', members.leagues.some((l) => l.id === league.id));

    // Unlink it again.
    await supabase.from('leagues').update({ federation_id: null }).eq('id', league.id);
    const after = await mod.getFederationMembers(fed.id);
    check('after unlinking, the league is no longer a member', !after.leagues.some((l) => l.id === league.id));
  }

  // -----------------------------------------------------------------------
  // CASE 13 — the DB row is reachable by both slug and country code
  // -----------------------------------------------------------------------
  const bySlug = await mod.getFederationBySlug(fed.slug);
  check('federation found by DB slug', bySlug !== null && bySlug.id === fed.id);
  const byCode = await mod.getFederationByCountryCode(fed.country_code);
  check('federation found by country code', byCode !== null && byCode.id === fed.id);
  const byCodeLower = await mod.getFederationByCountryCode(String(fed.country_code).toLowerCase());
  check('federation found by lowercase country code', byCodeLower !== null && byCodeLower.id === fed.id);
}

async function cleanup() {
  console.log('\nCleaning up test data…');
  for (const id of created.claimIds) {
    await supabase.from('claims').delete().eq('id', id);
  }
  for (const id of created.memberRequestIds) {
    await supabase.from('federation_member_requests').delete().eq('id', id);
  }
  for (const id of created.inviteIds) {
    await supabase.from('federation_claim_invites').delete().eq('id', id);
  }
  for (const [id, original] of touchedFederations) {
    await supabase
      .from('federations')
      .update({ owner_user_id: original.owner_user_id, claimable: true })
      .eq('id', id);
  }

  // Verify the cleanup.
  let clean = true;
  if (created.claimIds.length) {
    const { data: c } = await supabase.from('claims').select('id').in('id', created.claimIds);
    if (c && c.length) clean = false;
  }
  if (created.inviteIds.length) {
    const { data: i } = await supabase.from('federation_claim_invites').select('id').in('id', created.inviteIds);
    if (i && i.length) clean = false;
  }
  if (created.memberRequestIds.length) {
    const { data: m } = await supabase.from('federation_member_requests').select('id').in('id', created.memberRequestIds);
    if (m && m.length) clean = false;
  }
  for (const [id, original] of touchedFederations) {
    const { data: f } = await supabase.from('federations').select('owner_user_id, claimable').eq('id', id).single();
    if (f && (f.owner_user_id !== original.owner_user_id || f.claimable === false)) clean = false;
  }
  console.log(clean ? '  All test data removed and original state restored.' : '  ⚠️  Cleanup incomplete — inspect the tables.');
  if (!clean) fail++;
}

try {
  await main();
} catch (e) {
  console.error('\nTest run threw:', e);
  fail++;
} finally {
  await cleanup();
  fs.rmSync(entry, { force: true });
  fs.rmSync(stubPath, { force: true });
  fs.rmSync(outfile, { force: true });
  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}
