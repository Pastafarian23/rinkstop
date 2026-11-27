// Organization Plus offer shown after a rink, team or organisation claim (B-4, staging, 2026-11-27).
// Prices come from src/lib/pricing.ts (TIERS.org_plus.priceUsd). The first-year promotion is the
// EXISTING 50% first-annual-payment offer; this file does not change its terms or Stripe setup.

import { TIERS } from '@/lib/pricing';

export const ORG_PLUS_TIER = 'org_plus' as const;
export const OFFER_CLAIM_TYPES = ['rink', 'team'] as const;

export function shouldShowOrgPlusOffer(claimType: string | null | undefined): boolean {
  return !!claimType && (OFFER_CLAIM_TYPES as readonly string[]).includes(claimType);
}

export function orgPlusPrices(): { listUsd: number; firstYearUsd: number } {
  const listUsd = TIERS[ORG_PLUS_TIER].priceUsd;
  const firstYearUsd = Math.round(listUsd * 50) / 100; // 50% off the first annual payment
  return { listUsd, firstYearUsd };
}

export function orgPlusOfferCopy(claimType: string | null | undefined): { headline: string; benefits: string[]; ctaLabel: string; href: string } {
  const { listUsd, firstYearUsd } = orgPlusPrices();
  const what = claimType === 'team' ? 'team' : 'rink';
  return {
    headline: `Run your ${what} from RinkStop: $${firstYearUsd.toFixed(2)} for year one`,
    benefits: [
      'Put your roster, schedule and results in one place that parents and players can find',
      'Take registrations and payments online, without chasing cheques or cash',
      'Keep practice plans and team communications in one dashboard',
      `Year one is $${firstYearUsd.toFixed(2)} (50% off, first annual payment). Then $${listUsd}/year. Cancel anytime.`,
    ],
    ctaLabel: `Start Organization Plus: $${firstYearUsd.toFixed(2)} for year one`,
    href: '/pricing?tier=org_plus&intent=upgrade',
  };
}

export const ORG_PLUS_EVENTS = {
  offerShown: 'claim_upgrade_offer_shown',
  ctaClick: 'claim_upgrade_cta_click',
} as const;
