'use client';

import { useRouter } from 'next/navigation';
import { formatTierPrice } from '@/lib/pricing';
import type { TierName } from '@/lib/pricing';

interface ClaimButtonProps {
  href: string;
  rinkId: string;
  rinkSlug: string;
  query: string;
  /** Cheapest business-track paid tier for the price label. */
  priceTier?: TierName;
}

/**
 * "Claim This →" CTA on /claim-your-listing search results.
 *
 * 1. Fires a best-effort `claim_button_clicked` analytics event via
 *    navigator.sendBeacon to /api/track. Matches the pattern used by
 *    /pricing for `checkout_started`. Never blocks the navigation.
 *
 * 2. Navigates to the destination (typically /login?redirect_url=...).
 *
 * Button copy shows the cheapest business-track tier price as
 * "from $X/yr" so the operator knows the cost before clicking.
 * Sourced from src/lib/pricing.ts so it's never out of sync.
 */
export function ClaimButton({ href, rinkId, rinkSlug, query, priceTier = 'business_listing' }: ClaimButtonProps) {
  const router = useRouter();
  const price = formatTierPrice(priceTier); // e.g. "$29.99"

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();

    // Best-effort analytics. sendBeacon is fire-and-forget; a dropped
    // network call cannot block the navigation.
    try {
      const payload = JSON.stringify({
        name: 'claim_button_clicked',
        pathname: '/claim-your-listing',
        props: {
          rink_id: rinkId,
          rink_slug: rinkSlug,
          query: query || null,
          price_shown: price,
        },
      });
      const blob = new Blob([payload], { type: 'application/json' });
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon('/api/track', blob);
      } else {
        // Fallback: fetch (best-effort, no await).
        fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }).catch(() => {});
      }
    } catch {
      // never block the click on analytics failure
    }

    router.push(href);
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      data-testid="claim-this-button"
      style={{
        background: '#C8102E',
        color: '#fff',
        padding: '0.55rem 1.25rem',
        borderRadius: 8,
        textDecoration: 'none',
        fontWeight: 700,
        fontSize: '0.875rem',
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
      }}
    >
      Claim & Verify — from {price}/yr →
    </a>
  );
}