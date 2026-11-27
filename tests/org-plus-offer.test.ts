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
  it('copy shows $49.50 year one and $99 afterwards, with cancel wording', () => {
    const c = orgPlusOfferCopy('rink');
    expect(c.ctaLabel).toContain('$49.50');
    expect(c.benefits.join(' ')).toContain('Then $99/year');
    expect(c.benefits.join(' ')).toContain('Cancel anytime');
  });
  it('the team copy says team, the rink copy says rink', () => {
    expect(orgPlusOfferCopy('team').headline).toContain('your team');
    expect(orgPlusOfferCopy('rink').headline).toContain('your rink');
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
