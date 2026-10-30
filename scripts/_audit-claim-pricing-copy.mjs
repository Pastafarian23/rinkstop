#!/usr/bin/env node
/**
 * Gate 7 — claim-funnel pricing copy consistency.
 *
 * WHY THIS EXISTS (2026-10-30, Arnel-flagged):
 *   A submitter searched for their team on /claim-your-listing and the result
 *   card button read:
 *
 *       Claim & Verify — from $99/yr →
 *
 *   while the page header directly above it read:
 *
 *       "Claiming is free — verification is also free for every profile type."
 *
 *   and the tab said "Teams · free to claim", and the /add-listing page says
 *   submitting a listing is free. Four surfaces, two different truths, on one
 *   screen.
 *
 *   The root cause was `ENTITY_TO_TIER` in TWO files mapping a claim to the
 *   PAID tier (org_plus = $99 / verified_identity = $24.99), plus a button
 *   label that rendered `formatTierPrice(priceTier)` inside the button.
 *
 *   THE TRUTH: claiming is FREE. `LISTING_CLAIMS_PER_TIER` in src/lib/pricing.ts
 *   grants `free` -> 1 claim and `org_free` -> 1 claim. Paid tiers buy TOOLS
 *   (photos, lead capture, payments, multiple workspaces, reporting) — never
 *   the ability to claim.
 *
 * WHAT THIS CHECKS:
 *   1. No claim-funnel source file renders a paid price inside a claim CTA
 *      label (the "Claim & Verify — from $X" pattern).
 *   2. No claim-funnel source file labels a paid tier as "Required".
 *   3. Every claim-funnel tier map resolves to the FREE tier.
 *   4. The claim page copy still states that claiming is free.
 *
 * Usage:  node scripts/_audit-claim-pricing-copy.mjs
 * Exit 0 = all assertions pass, 1 = a failure.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');

let failures = 0;
let checks = 0;

function check(label, ok, detail = '') {
  checks++;
  if (ok) {
    console.log(`  ✓ ${label}`);
  } else {
    failures++;
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.(tsx?|jsx?)$/.test(entry)) out.push(full);
  }
  return out;
}

const files = walk(SRC);
const read = (f) => readFileSync(f, 'utf8');

// ---------------------------------------------------------------------------
console.log('\n1. No paid price rendered inside a claim CTA label');
// ---------------------------------------------------------------------------
// The bug shape: a claim CTA whose VISIBLE LABEL contains a price, e.g.
//   Claim & Verify — from $99/yr →
//   Claim it — $99
// i.e. the price sits between the CTA verb and its arrow/destination, so it
// reads as the cost of the click.
//
// A price in SURRROUNDING prose is legitimate and must NOT be flagged:
//   "Claiming is free ... Upgrade to Organization Plus ($99/yr) only if..."
//   "CLAIM YOUR LISTING IS FREE — BUT HERE'S WHAT YOU GET FOR $19.99/YR"
// Those are explicitly optional-upsgrade mentions, not CTA labels.
//
// So: look for a price on a line that ALSO carries the CTA arrow or a CTA
// that ends in a price, and exclude lines that say "free" or "upgrade".
const CLAIM_CTA_RE = /(\$[0-9][^\n]{0,60}(→|->))/i;
const ctaHits = [];

// Scope: only the CLAIM FUNNEL. The $499 dataset-license CTA and the $24.99
// passport upsell are unrelated products with their own pricing — flagging
// them would make this gate noise, and noise makes gates get ignored.
const CLAIM_FUNNEL_SCOPE = [
  'src/app/claim-your-listing',
  'src/app/sign-up',
  'src/app/dashboard/claims',
  'src/components/ClaimThisListing.tsx',
  'src/lib/submission-status.ts',
];
function inScope(f) {
  const rel = relative(ROOT, f);
  return CLAIM_FUNNEL_SCOPE.some((s) => rel === s || rel.startsWith(`${s}/`));
}

for (const f of files) {
  if (!inScope(f)) continue;
  const src = read(f);
  src.split('\n').forEach((line, i) => {
    if (!CLAIM_CTA_RE.test(line)) return;
    const t = line.trim();
    // Ignore comment lines — a comment explaining the bug is fine.
    if (t.startsWith('*') || t.startsWith('//') || t.startsWith('/*')) return;
    // Ignore lines that explicitly frame the price as optional/free.
    if (/\bfree\b/i.test(t) || /\bupgrade\b/i.test(t) || /\boptional\b/i.test(t)) return;
    // Ignore JSX text nodes that are clearly a separate optional-upsgrade block.
    if (/WHAT YOU GET/i.test(t)) return;
    ctaHits.push(`${relative(ROOT, f)}:${i + 1} — ${t.slice(0, 140)}`);
  });
}
check(
  'no source line puts a $ price inside a claim CTA label',
  ctaHits.length === 0,
  ctaHits.slice(0, 5).join(' | '),
);

// ---------------------------------------------------------------------------
console.log('\n2. No claim-funnel file labels a paid tier "Required"');
// ---------------------------------------------------------------------------
// "Required" next to a tier price means the user is told they must pay.
const REQUIRED_RE = />\s*Required\s*</;
const requiredHits = [];
const CLAIM_FUNNEL = [
  'src/app/claim-your-listing',
  'src/app/sign-up',
  'src/app/dashboard/claims',
  'src/components/ClaimThisListing.tsx',
];
for (const rel of CLAIM_FUNNEL) {
  const dir = join(ROOT, rel);
  let list = [];
  try {
    const st = statSync(dir);
    list = st.isDirectory() ? walk(dir) : [dir];
  } catch {
    continue;
  }
  for (const f of list) {
    const src = read(f);
    if (REQUIRED_RE.test(src)) {
      requiredHits.push(relative(ROOT, f));
    }
  }
}
check(
  'no claim-funnel component renders a "Required" tier badge',
  requiredHits.length === 0,
  requiredHits.join(', '),
);

// ---------------------------------------------------------------------------
console.log('\n3. Claim-funnel tier maps resolve to the FREE tier');
// ---------------------------------------------------------------------------
// The exact bug: ENTITY_TO_TIER mapping a claim to org_plus / verified_identity.
const TIER_MAP_RE = /ENTITY_TO_TIER[^=]*=\s*\{([\s\S]{0,400}?)\}/g;
const tierMapHits = [];
for (const rel of CLAIM_FUNNEL) {
  const dir = join(ROOT, rel);
  let list = [];
  try {
    const st = statSync(dir);
    list = st.isDirectory() ? walk(dir) : [dir];
  } catch {
    continue;
  }
  for (const f of list) {
    const src = read(f);
    let m;
    TIER_MAP_RE.lastIndex = 0;
    while ((m = TIER_MAP_RE.exec(src)) !== null) {
      const body = m[1];
      const values = [...body.matchAll(/:\s*'([a-z_]+)'/g)].map((x) => x[1]);
      for (const v of values) {
        if (v !== 'free' && v !== 'org_free') {
          tierMapHits.push(`${relative(ROOT, f)} — maps a claim to '${v}'`);
        }
      }
    }
  }
}
check(
  'every claim-funnel tier map points at a free tier',
  tierMapHits.length === 0,
  tierMapHits.join(' | '),
);

// ---------------------------------------------------------------------------
console.log('\n4. The claim page still says claiming is free');
// ---------------------------------------------------------------------------
const claimPage = join(ROOT, 'src/app/claim-your-listing/page.tsx');
if (readFileSync(claimPage, 'utf8').includes('Claiming is free')) {
  check('claim page states "Claiming is free"', true);
} else {
  check('claim page states "Claiming is free"', false, 'the free-claim promise is missing');
}

// ---------------------------------------------------------------------------
console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures > 0) {
  console.log('\n=== CLAIM PRICING COPY AUDIT FAILED ===');
  console.log('A paid price is being shown as the cost of claiming. Claiming is FREE.');
  console.log('Paid tiers buy extra TOOLS, never the ability to claim.');
  process.exit(1);
}
console.log('✓ Claim funnel consistently says claiming is free.');
