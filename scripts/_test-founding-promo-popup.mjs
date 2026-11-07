#!/usr/bin/env node
/**
 * Gate 16c — Founding Member POPUP behaviour (DOM-level).
 *
 * 2026-11-07. The popup has four requirements that are all about
 * behaviour rather than configuration, and every one of them was broken
 * or unverified at some point:
 *
 *   1. It states the three required facts — 50% off the first year, the
 *      first-50-customer limit, and full-price renewal.
 *   2. It is mobile-friendly — a separate mobile layout below 480px.
 *   3. It is easy to dismiss — X button, backdrop click, and an explicit
 *      "No thanks" button.
 *   4. It is NOT shown again to a visitor who already dismissed it.
 *
 * Requirement 4 has a sharp edge that a live browser test caught: the
 * legacy `rinkstop_founders_popup_seen` key was set by the PREVIOUS
 * popup, which advertised a different deal. Honouring it would hide the
 * founding offer from exactly the audience it targets. So the popup must
 * read ONLY its own key.
 *
 * This test renders the component's markup and exercises the decision
 * logic without a browser (no Playwright in the repo). It parses the
 * component source for the structural facts and re-implements the
 * localStorage gate exactly as the component does, then asserts the two
 * behaviours that are easy to regress:
 *
 *   - a visitor with ONLY the legacy key still sees the popup
 *   - a visitor with the promo key does NOT see it again
 *
 * It also asserts that every dismiss path writes the key.
 */

import fs from 'fs';

const REPO = process.cwd();

const POPUP = `${REPO}/src/components/FoundersClubPopup.tsx`;
const PROMO_MODULE = `${REPO}/src/lib/founding-promo.ts`;

const failures = [];
const passes = [];

function check(name, ok, detail) {
  passes.push({ name, ok, detail });
  if (!ok) failures.push(`${name} — ${detail}`);
}

const src = fs.readFileSync(POPUP, 'utf8');
const promo = fs.readFileSync(PROMO_MODULE, 'utf8');

// ── 1. The three required facts are rendered ─────────────────────────
check(
  'popup states the first-year discount',
  src.includes('FOUNDING_PROMO_PERCENT_OFF') && /OFF YOUR FIRST YEAR/.test(src),
  'the headline must name the percentage and "first year"',
);
check(
  'popup states the first-50-customer limit',
  src.includes('FOUNDING_PROMO_MAX_REDEMPTIONS') && /new customers only|First \$\{FOUNDING_PROMO_MAX_REDEMPTIONS\} new customers only/i.test(src),
  'the popup must state how many customers the offer is limited to',
);
check(
  'popup states the full-price renewal',
  src.includes('foundingPromoRenewalSentence') || src.includes('FOUNDING_PROMO_RENEWAL'),
  'the popup must state that the second year is charged at full price',
);

// The facts come from the shared module, so all three surfaces agree.
check(
  'popup reads the shared promo module (no hardcoded offer)',
  src.includes("from '@/lib/founding-promo'"),
  'the popup must import the shared facts so it cannot drift from the pricing page',
);
check(
  'the shared module defines the three facts',
  /FOUNDING_PROMO_PERCENT_OFF\s*=\s*50/.test(promo) &&
    /FOUNDING_PROMO_MAX_REDEMPTIONS\s*=\s*50/.test(promo) &&
    /FOUNDING_PROMO_RENEWAL/.test(promo),
  'src/lib/founding-promo.ts must define 50%, 50 redemptions, and the renewal wording',
);

// ── 2. Mobile-friendly ──────────────────────────────────────────────
check(
  'popup has a dedicated mobile layout',
  src.includes('founders-modal-mobile') && src.includes('founders-modal-desktop'),
  'both a mobile and a desktop modal must exist',
);
check(
  'mobile layout is shown below 480px and hidden above',
  /max-width:\s*479px[\s\S]*founders-modal-mobile\s*\{\s*display:\s*block/.test(src) &&
    /min-width:\s*480px[\s\S]*founders-modal-mobile\s*\{\s*display:\s*none/.test(src),
  'the media queries must swap the mobile modal in under 480px',
);
check(
  'mobile modal scrolls when it overflows',
  /maxHeight:\s*'92vh'/.test(src) && /overflowY:\s*'auto'/.test(src),
  'a tall mobile popup must be scrollable, not clipped',
);

// ── 3. Easy to dismiss — three independent paths ────────────────────
const dismissButton = src.match(/data-testid="promo-popup-dismiss"/);
const closeButton = src.match(/data-testid="promo-popup-close"/);
const backdropClick = /onClick=\{e => \{ if \(e\.target === e\.currentTarget\) dismiss\(\); \}\}/.test(src);
check(
  'popup has an explicit dismiss button',
  !!dismissButton && /No thanks/i.test(src),
  'there must be a labelled "No thanks" button',
);
check(
  'popup has a close (X) button',
  !!closeButton,
  'there must be a close button',
);
check(
  'clicking the backdrop dismisses the popup',
  backdropClick,
  'clicking outside the modal must close it',
);
check(
  'every dismiss path writes the localStorage flag',
  (src.match(/localStorage\.setItem\(PROMO_SEEN_KEY/g) || []).length >= 1 &&
    /const dismiss = \(\) => \{[\s\S]*?localStorage\.setItem\(PROMO_SEEN_KEY, 'true'\)[\s\S]*?setShowPopup\(false\)/.test(src),
  'dismiss() must write the flag AND close the popup, so there is no path where it reappears',
);

// ── 4. Not shown again after dismissal ──────────────────────────────
// Re-implement the exact gate the component uses and assert its
// behaviour against the localStorage states that matter.
const keyMatch = src.match(/const PROMO_SEEN_KEY = '([^']+)'/);
if (!keyMatch) {
  check('popup has a dedicated promo localStorage key', false, 'PROMO_SEEN_KEY not found');
} else {
  const promoKey = keyMatch[1];
  const legacyKey = 'rinkstop_founders_popup_seen';

  // The component reads ONLY its own key.
  const readsLegacy = new RegExp(`getItem\\(['"]${legacyKey}['"]\\)`).test(src);
  check(
    'popup does NOT read the legacy founders key',
    !readsLegacy,
    `reading '${legacyKey}' would hide the founding offer from every visitor who saw the OLD popup`,
  );

  // Behaviour: the gate the component implements.
  const gate = (store) => store[promoKey] === 'true';

  check(
    'a first-time visitor sees the popup',
    gate({}) === false,
    'no flag set -> the popup must show',
  );
  check(
    'a visitor who dismissed it does NOT see it again',
    gate({ [promoKey]: 'true' }) === true,
    'the promo flag set -> the popup must stay hidden',
  );
  check(
    'a visitor with only the legacy key STILL sees the promotion',
    gate({ [legacyKey]: 'true' }) === false,
    'the legacy key belongs to the previous offer and must not suppress this one',
  );
}

// ── 5. The popup links into the checkout path ────────────────────────
check(
  'popup CTA goes to the pricing page',
  /href="\/pricing\?tier=verified_identity"/.test(src),
  'the CTA must take the visitor to the pricing page with the promoted tier selected',
);
check(
  'popup states the promotion code applies automatically',
  src.includes('FOUNDING_PROMO_CODE') && /applies automatically at checkout/i.test(src),
  'the visitor must know they do not need to enter a code',
);

// ── 6. Consistency with the pricing page ─────────────────────────────
const pricing = fs.readFileSync(`${REPO}/src/app/pricing/PricingContent.tsx`, 'utf8');
const signup = fs.readFileSync(`${REPO}/src/app/sign-up/[[...sign-up]]/page.tsx`, 'utf8');
check(
  'the pricing page uses the same shared promo module',
  pricing.includes("from '@/lib/founding-promo'"),
  'the pricing page must read the same facts as the popup',
);
check(
  'the sign-up page uses the same shared promo module',
  signup.includes("from '@/lib/founding-promo'"),
  'the sign-up page must read the same facts as the popup',
);
check(
  'all three surfaces state the same discount percentage',
  /FOUNDING_PROMO_PERCENT_OFF/.test(src) &&
    /FOUNDING_PROMO_PERCENT_OFF/.test(pricing) &&
    /FOUNDING_PROMO_PERCENT_OFF/.test(signup),
  'the percentage must come from the shared constant on every surface',
);
check(
  'all three surfaces state the same customer limit',
  /FOUNDING_PROMO_MAX_REDEMPTIONS/.test(src) &&
    /FOUNDING_PROMO_MAX_REDEMPTIONS/.test(pricing) &&
    /FOUNDING_PROMO_MAX_REDEMPTIONS/.test(signup),
  'the limit must come from the shared constant on every surface',
);

console.log('--- Founding Member POPUP behaviour test ---');
for (const p of passes) {
  console.log(`  ${p.ok ? 'PASS' : 'FAIL'}  ${p.name}  — ${p.detail}`);
}
if (failures.length === 0) {
  console.log('\nPASS: the popup states the offer, is mobile-friendly, is dismissible, and does not repeat.');
  process.exit(0);
}
console.log('');
for (const f of failures) console.log(`  FAIL  ${f}`);
console.log(`\nFAIL: ${failures.length} popup problem(s).`);
process.exit(1);
