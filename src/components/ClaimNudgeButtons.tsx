'use client';

/**
 * Client island for the claim nudge buttons.
 *
 * Wraps the primary "Claim it free" and secondary "See what you can
 * unlock" CTAs from ClaimListingNudge so they fire the right funnel
 * events before navigation. Uses trackClient (sendBeacon) so the event
 * survives navigation away.
 */
import Link from 'next/link';
import { trackClient } from '@/lib/client-track';

export default function ClaimNudgeButtons({
  entityType,
  entityId,
  entityName,
  focusHref,
  pricingHref,
}: {
  entityType: 'rink' | 'team' | 'league' | 'player';
  entityId: string;
  entityName: string;
  focusHref: string;
  pricingHref: string;
}) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
      <Link
        href={focusHref}
        data-claim-cta="nudge_primary"
        onClick={() =>
          trackClient('claim_button_clicked', {
            listing_type: entityType,
            listing_id: entityId,
            cta_location: 'nudge_top',
          })
        }
        style={{
          background: '#38bdf8',
          color: '#0f172a',
          fontWeight: 700,
          fontSize: 13,
          padding: '7px 14px',
          borderRadius: 6,
          textDecoration: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        Claim it free →
      </Link>
      <Link
        href={pricingHref}
        data-claim-cta="nudge_secondary"
        onClick={() =>
          trackClient('pricing_card_clicked', {
            listing_type: entityType,
            listing_id: entityId,
            cta_location: 'nudge_top',
          })
        }
        style={{
          background: 'transparent',
          color: '#cbd5e1',
          border: '1px solid rgba(148,163,184,0.4)',
          fontWeight: 600,
          fontSize: 12.5,
          padding: '6px 12px',
          borderRadius: 6,
          textDecoration: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        See what you can unlock
      </Link>
    </div>
  );
}
