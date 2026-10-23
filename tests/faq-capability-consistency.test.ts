// tests/faq-capability-consistency.test.ts
//
// Guards the FAQ against describing a RinkStop that does not exist.
//
// WHY THIS FILE EXISTS
// The FAQ is the largest customer-facing surface on the site (101 questions at
// the time of writing) and it had drifted from the product in three ways found
// during the 2026-10-22 audit:
//
//   1. It said free listing claims "unlock lead capture" — lead capture is gated
//      at org_plus, and the claim itself is free.
//   2. Two separate answers described claiming as requiring a paid plan, using
//      the retired tier name "RinkStop Pro business plan".
//   3. The identity dashboard said verification "is available on Hockey
//      Passport" while the server hardcodes canVerify=true because it is free
//      on every tier.
//
// The class is broader than those three: published numbers (allowances, caps)
// silently rot when a constant changes, exactly like the retired $149/$399/$999
// prices sat in marketing copy long after the products were archived.
//
// So this file asserts the FAQ's CUSTOMER-VISIBLE STRINGS against the canonical
// constants — not against prose in another file.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  MEDIA_ALLOWANCES,
  formatBytes,
} from '../src/lib/media-entitlements';
import {
  LISTING_CLAIMS_PER_TIER,
  PLAYER_CAPACITY_PER_TIER,
  TEAM_LIMIT_PER_TIER,
} from '../src/lib/pricing';

const FAQ = readFileSync(join(process.cwd(), 'src/app/faq/page.tsx'), 'utf8');

/**
 * All customer-visible strings in the FAQ.
 *
 * Questions and answers are collected SEPARATELY. An earlier version filtered
 * to strings longer than 25 characters, which silently dropped every question —
 * "Does Free allow video?" is 22 characters — and made the topic-coverage
 * tests fail for content that was present. The distinction matters: coverage is
 * a question ("do we answer it?"), accuracy is an answer ("do we state it
 * correctly?").
 */
function faqQuestions(): string[] {
  return (FAQ.match(/q: '((?:[^'\\]|\\.)*)'/g) ?? []).map((raw) =>
    raw.replace(/^q: '/, '').replace(/'$/, '').replace(/\\'/g, "'"),
  );
}

function faqAnswers(): string[] {
  return (FAQ.match(/a: '((?:[^'\\]|\\.)*)'/g) ?? []).map((raw) =>
    raw.replace(/^a: '/, '').replace(/';?$/, '').replace(/\\'/g, "'"),
  );
}

const STRINGS = faqAnswers();
const QUESTIONS = faqQuestions();

/** Find the answer whose QUESTION matches, by pairing q/a positionally. */
function answerFor(questionRe: RegExp): string {
  const questions = faqQuestions();
  const answers = faqAnswers();
  const idx = questions.findIndex((q) => questionRe.test(q));
  if (idx === -1) return '';
  return answers[idx] ?? '';
}

describe('the FAQ covers the capabilities the product now has', () => {
  const REQUIRED_TOPICS: Array<[string, RegExp]> = [
    ['media storage allowance', /media storage does my plan include/i],
    ['shared pool across features', /does my media allowance cover all my uploads/i],
    ['video availability per tier', /does free allow video/i],
    ['video duration limits', /how long can a video be/i],
    ['quota release on delete', /deleted a post but i am still at my storage limit/i],
    ['post restore window', /deleted a post by mistake/i],
    ['claim / player / team caps', /how many claims, players, and teams/i],
    ['what happens at the limit', /what happens if i exceed my plan limit/i],
    ['failed payment behaviour', /what happens when my payment fails/i],
    ['downgrade data handling', /if i downgrade, what happens to my data/i],
    ['refund policy', /do i get a refund if i cancel/i],
  ];

  for (const [label, re] of REQUIRED_TOPICS) {
    it(`documents ${label}`, () => {
      // Coverage is a QUESTION existing, not an answer containing the phrase.
      const asked = QUESTIONS.some((q) => re.test(q));
      expect(asked, `no FAQ question covers "${label}"`).toBe(true);
    });
  }

  it('has a category for the new material', () => {
    expect(FAQ).toMatch(/id: 'plans-media'/);
  });
});

describe('FAQ numbers match the canonical constants', () => {
  it('quotes the same storage allowance for each named tier', () => {
    // The FAQ states allowances in prose. If MEDIA_ALLOWANCES changes, this
    // fails rather than the page quietly publishing a stale number.
    const expectations: Array<[string, string, number]> = [
      ['Free', 'free', 15],
      ['Hockey Passport', 'verified_identity', 60],
      ['Hockey Passport Plus', 'identity_plus', 250],
    ];
    for (const [label, tier, items] of expectations) {
      const a = MEDIA_ALLOWANCES[tier as keyof typeof MEDIA_ALLOWANCES];
      const size = formatBytes(a.maxTotalBytes);
      const quoted = STRINGS.some(
        (s) => s.includes(size) && new RegExp(`\\b${items}\\b`).test(s),
      );
      expect(quoted, `FAQ does not quote ${label} as ${size} / ${items} items`).toBe(true);
      expect(a.maxAssetCount).toBe(items);
    }
  });

  it('quotes the same claim caps the enforcement uses', () => {
    const free = LISTING_CLAIMS_PER_TIER.free;
    const plus = LISTING_CLAIMS_PER_TIER.org_plus;
    expect(free).toBe(1);
    expect(plus).toBe(5);
    expect(STRINGS.some((s) => /Free accounts get one claim/i.test(s))).toBe(true);
    expect(STRINGS.some((s) => /Organization Plus raises that to five/i.test(s))).toBe(true);
  });

  it('quotes the same team and player caps the database enforces', () => {
    expect(TEAM_LIMIT_PER_TIER.org_plus).toBe(3);
    expect(TEAM_LIMIT_PER_TIER.org_pro).toBe(10);
    expect(PLAYER_CAPACITY_PER_TIER.org_plus).toBe(30);
    expect(PLAYER_CAPACITY_PER_TIER.org_pro).toBe(150);
    const s = answerFor(/how many claims, players, and teams/i);
    expect(s, 'no answer found for the capacity question').toBeTruthy();
    expect(s).toContain('5 claims');
    expect(s).toContain('3 team workspaces');
    expect(s).toContain('30 players');
    expect(s).toContain('25 claims');
    expect(s).toContain('10 teams');
    expect(s).toContain('150 players');
  });

  it('quotes video duration caps that match the allowance table', () => {
    const plus = MEDIA_ALLOWANCES.identity_plus;
    const orgPlus = MEDIA_ALLOWANCES.org_plus;
    const orgPro = MEDIA_ALLOWANCES.org_pro;
    const orgElite = MEDIA_ALLOWANCES.org_elite;
    expect(Math.round(plus.maxVideoSeconds! / 60)).toBe(10);
    expect(Math.round(orgPlus.maxVideoSeconds! / 60)).toBe(15);
    expect(Math.round(orgPro.maxVideoSeconds! / 60)).toBe(30);
    expect(Math.round(orgElite.maxVideoSeconds! / 60)).toBe(60);
    const s = answerFor(/how long can a video be/i);
    expect(s, 'no answer found for the video-duration question').toBeTruthy();
    for (const mins of [10, 15, 30, 60]) {
      expect(s, `FAQ omits the ${mins}-minute video cap`).toContain(`${mins} minutes`);
    }
    expect(s).toContain('100 MB');
  });
});

describe('the FAQ does not contradict how verification and claiming actually work', () => {
  it('does not say verification requires a paid plan', () => {
    // Verification is free on every tier (WS25, 2026-08-23). The identity
    // dashboard previously said it "is available on Hockey Passport", which
    // contradicted the server hardcoding canVerify=true.
    const offenders = STRINGS.filter(
      (s) =>
        /verification[^.]{0,90}(requires|available on|upgrade to)\s*Hockey Passport/i.test(s) ||
        /upgrade to Hockey Passport[^.]{0,60}to verify/i.test(s),
    );
    expect(offenders, 'FAQ still implies verification requires a paid plan').toEqual([]);
  });

  it('says claiming itself is free, and names the tier for owner tools', () => {
    expect(STRINGS.some((s) => /claim one listing for free/i.test(s))).toBe(true);
    // Lead capture, roster and payments are the paid part — the tier must be
    // named, otherwise a free claim reads as including them.
    const leadAnswer = STRINGS.find((s) => /lead capture[^.]{0,60}roster management/i.test(s));
    expect(leadAnswer, 'no FAQ answer separates free claiming from paid owner tools').toBeTruthy();
    expect(leadAnswer!).toMatch(/Organization Plus/);
  });

  it('uses no retired tier names', () => {
    const retired = /RinkStop Pro business plan|\bClub (Starter|Pro|Elite)\b|Business (Listing|Plus)|\bLeague tier\b/i;
    const offenders = STRINGS.filter((s) => retired.test(s));
    expect(offenders, 'FAQ still references a retired tier name').toEqual([]);
  });

  it('does not promise a refund that does not exist', () => {
    const offenders = STRINGS.filter(
      (s) => /\bwe (will )?refund|full refund|refund you\b/i.test(s),
    );
    expect(offenders, 'FAQ promises a refund').toEqual([]);
    // ...and it must actually address the question.
    expect(QUESTIONS.some((q) => /do i get a refund if i cancel/i.test(q))).toBe(true);
    expect(answerFor(/do i get a refund if i cancel/i)).toMatch(/do not refund the unused remainder/i);
  });

  it('does not promise automatic proration', () => {
    const offenders = STRINGS.filter(
      (s) => /prorat/i.test(s) || /unused portion[^.!]{0,40}credited/i.test(s),
    );
    expect(offenders, 'FAQ promises automatic proration').toEqual([]);
  });
});

describe('the identity dashboard matches the free-verification implementation', () => {
  const CLIENT = readFileSync(
    join(process.cwd(), 'src/app/dashboard/identity/IdentityClient.tsx'),
    'utf8',
  );
  const PAGE = readFileSync(
    join(process.cwd(), 'src/app/dashboard/identity/page.tsx'),
    'utf8',
  );

  it('the server hardcodes canVerify = true', () => {
    // If this ever changes, the verification copy must change with it.
    expect(PAGE).toMatch(/const canVerify = true/);
  });

  it('the client no longer tells anyone to upgrade to verify', () => {
    expect(CLIENT).not.toMatch(/Upgrade to Hockey Passport \(\$24\.99\/yr\) to verify/);
  });

  it('states that verification is free on every account', () => {
    expect(CLIENT).toMatch(/free on every account/i);
  });

  it('both free and paid routes still exist and are routed correctly', () => {
    // A paid-tier route and a free route, chosen by tier. Both must remain or
    // verification silently breaks for one segment.
    expect(PAGE).toContain("/api/verification/start-free");
    expect(PAGE).toContain("/api/identity/verify/start");
  });
});

describe('the claim page metadata does not give away a paid feature', () => {
  const CLAIM = readFileSync(
    join(process.cwd(), 'src/app/claim-your-listing/page.tsx'),
    'utf8',
  );

  it('does not promise lead capture on a free verified listing', () => {
    // The meta description said "Verified listings get a checkmark, lead
    // capture, and featured rotation" while the page body correctly said lead
    // capture starts at Organization Plus. Lead capture is gated at org_plus.
    expect(CLAIM).not.toMatch(/Verified listings get a checkmark, lead capture/i);
    expect(CLAIM).not.toMatch(/lead capture, and featured rotation/i);
  });

  it('separates free claiming from paid lead capture', () => {
    expect(CLAIM).toMatch(/lead capture is an Organization Plus feature/i);
  });
});