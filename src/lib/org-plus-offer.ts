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
    headline: `Your ${what} is approved. Start Organization Plus for $${firstYearUsd.toFixed(2)} in year one`,
    // Only features verified as working in the code. Payments and online registrations are NOT listed.
    benefits: [
      `A ${what} page with roster, schedule and results, linked from your listing`,
      'Practice plans and a drills library for your coaches',
      'Up to 3 team workspaces (enforced when you create teams)',
      `Year one is $${firstYearUsd.toFixed(2)} (50% off the first annual payment). It renews at $${listUsd}/year.`,
    ],
    ctaLabel: `Start Organization Plus: $${firstYearUsd.toFixed(2)} year one`,
    href: '/pricing?tier=org_plus&intent=upgrade',
  };
}

