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
 * Renders the lead capture form for any listing with an active claim.
 * Lead capture is activity-gated (any active claim), not tier-gated
 * (was previously Pro-only per SPEC 2026-06-17).
 * - On server-rendered pages (rink, league) pass `forceShow={true}` if
 *   the server has already verified an active claim exists.
 * - On client-rendered pages (team), leave `forceShow` unset and this
 *   component will fetch the claim status client-side.
 *
 * Avoids showing the form on unclaimed listings.
 */
export default function ListingContactFormMount({ listingType, listingId, listingName, forceShow }: Props) {
  const [hasClaim, setHasClaim] = useState<boolean | 'loading'>(
    forceShow ? true : 'loading'
  );

  useEffect(() => {
    if (forceShow) return; // server already verified
    if (listingType === 'league') {
      // Leagues aren't a first-class claim type today — never show the form.
      setHasClaim(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/entities/${listingType}/${listingId}/claim`, { cache: 'no-store' });
        if (!res.ok) {
          if (!cancelled) setHasClaim(false);
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setHasClaim(Boolean(data?.claim));
        }
      } catch {
        if (!cancelled) setHasClaim(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [listingType, listingId, forceShow]);

  if (hasClaim === 'loading') {
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

  if (!hasClaim) return null;

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
