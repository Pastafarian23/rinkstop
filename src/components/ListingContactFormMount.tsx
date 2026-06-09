'use client';

import { useEffect, useState } from 'react';
import ListingContactForm from './ListingContactForm';

interface Props {
  listingType: 'rink' | 'team' | 'league';
  listingId: string;
  listingName: string;
  /** When true, we know the claim tier already (e.g., server-side check). */
  forceShow?: boolean;
}

/**
 * Renders the lead capture form ONLY if the listing's active claimer is Pro tier.
 * - On server-rendered pages (rink, league) pass `forceShow={true}` after a server-side
 *   `getEntityClaimTier()` returns tier === 'pro'.
 * - On client-rendered pages (team), leave `forceShow` unset and this component will
 *   fetch the tier client-side via the public claim endpoint.
 *
 * Avoids showing the form on unclaimed / Free / Supporter / Verified listings.
 */
export default function ListingContactFormMount({ listingType, listingId, listingName, forceShow }: Props) {
  const [tier, setTier] = useState<'pro' | 'verified' | 'supporter' | 'free' | null | 'loading'>(
    forceShow ? 'pro' : 'loading'
  );

  useEffect(() => {
    if (forceShow) return; // already know it's pro
    if (listingType === 'league') {
      // Leagues aren't a first-class claim type today — never show the form.
      setTier(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/entities/${listingType}/${listingId}/claim`, { cache: 'no-store' });
        if (!res.ok) {
          if (!cancelled) setTier(null);
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setTier(data?.claim?.tier ?? null);
        }
      } catch {
        if (!cancelled) setTier(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [listingType, listingId, forceShow]);

  if (tier === 'loading') {
    // Reserve a small space so the page doesn't jump when the form loads.
    return (
      <div
        style={{
          background: 'rgba(0,0,0,0.04)',
          borderRadius: 12,
          padding: '1.25rem',
          minHeight: 80,
          marginBottom: '24px',
        }}
        aria-hidden="true"
      />
    );
  }

  if (tier !== 'pro') return null;

  return (
    <div style={{ marginBottom: '24px' }}>
      <ListingContactForm
        listingType={listingType}
        listingId={listingId}
        listingName={listingName}
      />
    </div>
  );
}
