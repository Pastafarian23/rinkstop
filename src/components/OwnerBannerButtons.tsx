'use client';

/**
 * Client island for the owner-banner CTAs (signed-in owners only).
 * Fires funnel events for "manage profile" click and "see upgrade" click.
 */
import Link from 'next/link';
import { trackClient } from '@/lib/client-track';

export default function OwnerBannerButtons({
  entityType,
  entityId,
  dashboardHref,
  upgradeHref,
  upgradeLabel,
}: {
  entityType: 'rink' | 'team' | 'league' | 'player';
  entityId: string;
  dashboardHref: string;
  upgradeHref: string;
  upgradeLabel: string;
}) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
      <Link
        href={dashboardHref}
        onClick={() =>
          trackClient('listing_cta_clicked', {
            listing_type: entityType,
            listing_id: entityId,
            cta_location: 'owner_banner_primary',
            destination: 'dashboard',
          })
        }
        style={{
          background: '#4ade80',
          color: '#052e16',
          fontWeight: 700,
          fontSize: 13,
          padding: '7px 14px',
          borderRadius: 6,
          textDecoration: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        Manage your profile →
      </Link>
      <Link
        href={upgradeHref}
        onClick={() =>
          trackClient('pricing_card_clicked', {
            listing_type: entityType,
            listing_id: entityId,
            cta_location: 'owner_banner_secondary',
            destination: 'pricing',
            upgrade_label: upgradeLabel,
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
        See upgrade options
      </Link>
    </div>
  );
}
