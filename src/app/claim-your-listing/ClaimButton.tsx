'use client';

import { useRouter } from 'next/navigation';

interface ClaimButtonProps {
  href: string;
  rinkId: string;
  rinkSlug: string;
  query: string;
  /**
   * The tier the COPY should mention as the optional paid upgrade.
   *
   * 2026-10-30 (Arnel-flagged): this button used to render
   * "Claim & Verify — from $99/yr →" using `formatTierPrice(priceTier)`.
   * That directly contradicted the page header, which says "Claiming is
   * free — verification is also free for every profile type", and the
   * tab labels ("Rinks · free to claim"). A submitter searching for a team
   * to claim was told the claim costs $99. **Claiming IS free**; only the
   * optional plan features are paid. The price now appears only as a
   * separate, clearly-labelled OPTIONAL UPGRADE line below the button —
   * never inside the button label.
   */
  priceTier?: 'org_plus' | 'verified_identity';
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
 * Button copy says "Claim & Verify — free". The optional paid UPGRADE price
 * is rendered as a separate, clearly-labelled line underneath the button so
 * it can never be read as the cost of claiming. See the prop docs above.
 */
export function ClaimButton({ href, rinkId, rinkSlug, query, priceTier = 'org_plus' }: ClaimButtonProps) {
  const router = useRouter();
  const price = priceTier === 'verified_identity' ? '$24.99' : '$99';
  const upgradeName = priceTier === 'verified_identity' ? 'Hockey Passport' : 'Organization Plus';

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();

    // Mark this session so the pagehide tracker knows not to count this as
    // abandonment. sessionStorage is shared across same-tab navigations.
    try {
      window.sessionStorage.setItem('claim_btn_clicked_session', '1');
    } catch {
      // sessionStorage can throw under strict privacy modes — non-fatal
    }

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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
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
        Claim &amp; Verify — free →
      </a>
      {/* The paid tier is an OPTIONAL upgrade, never the cost of claiming.
          Kept as a separate muted line so it cannot be read as a price for
          the claim itself (Arnel-flagged 2026-10-30). */}
      <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' }}>
        Optional: {upgradeName} {price}/yr adds photos, hours &amp; lead capture
      </span>
    </div>
  );
}