import { TEAM_LIMIT_PER_TIER } from '@/lib/pricing';
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { shouldShowOrgPlusOffer, orgPlusPrices, orgPlusOfferCopy, ORG_PLUS_EVENTS } from '@/lib/org-plus-offer';

describe('which claims see the offer', () => {
  it('rink and team claims see it', () => {
    expect(shouldShowOrgPlusOffer('rink')).toBe(true);
    expect(shouldShowOrgPlusOffer('team')).toBe(true);
  });
  it('player, league, federation and unknown claims do not', () => {
    for (const t of ['player', 'league', 'federation', '', null, undefined, 'constructor']) {
      expect(shouldShowOrgPlusOffer(t as never)).toBe(false);
    }
  });
});

describe('prices come from pricing.ts and match the existing 50% first-year promotion', () => {
  it('list price is the pricing.ts value and year one is half of it', () => {
    expect(orgPlusPrices()).toEqual({ listUsd: 99, firstYearUsd: 49.5 });
  });
  it('copy shows $49.50 year one and $99 renewal, and no unverified features', () => {
    const c = orgPlusOfferCopy('rink');
    expect(c.ctaLabel).toContain('$49.50');
    expect(c.benefits.join(' ')).toContain('renews at $99/year');
    expect(c.benefits.join(' ')).not.toMatch(/payments collection|dues|registration|cancel anytime/i);
    expect(c.headline).toContain('approved');
  });
  it('the team copy says team, the rink copy says rink', () => {
    expect(orgPlusOfferCopy('team').headline).toMatch(/your team/i);
    expect(orgPlusOfferCopy('rink').headline).toMatch(/your rink/i);
  });
  it('the link is the existing pricing deep link for Organization Plus', () => {
    expect(orgPlusOfferCopy('rink').href).toBe('/pricing?tier=org_plus&intent=upgrade');
  });
});

describe('measurement events are on the tracking allowlist', () => {
  const track = readFileSync(join(process.cwd(), 'src/app/api/track/route.ts'), 'utf8');
  it('offer shown and CTA click are both allowlisted', () => {
    expect(track).toContain(`'${ORG_PLUS_EVENTS.offerShown}'`);
    expect(track).toContain(`'${ORG_PLUS_EVENTS.ctaClick}'`);
  });
});

describe('verified benefits only (30-player promise removed; team limit is enforced)', () => {
  it('no offer text mentions a player cap', () => {
    for (const t of ['rink','team'] as const) {
      expect(orgPlusOfferCopy(t).benefits.join(' ')).not.toMatch(/players/i);
    }
  });
  it('the team limit benefit is stated and matches TEAM_LIMIT_PER_TIER', () => {
    expect(TEAM_LIMIT_PER_TIER.org_plus).toBe(3);
    expect(orgPlusOfferCopy('team').benefits.join(' ')).toContain('Up to 3 team workspaces');
  });
  it('pricing feature list no longer contains the unenforced 30-player line', () => {
    const src = readFileSync(join(process.cwd(), 'src/lib/pricing.ts'), 'utf8');
    expect(src).not.toContain("'Up to 30 players'");
  });
  it('the preview route is blocked on production', () => {
    const src = readFileSync(join(process.cwd(), 'src/app/preview/org-plus-offer/page.tsx'), 'utf8');
    expect(src).toContain("process.env.VERCEL_ENV === 'production'");
    expect(src).toContain('notFound()');
  });
});
