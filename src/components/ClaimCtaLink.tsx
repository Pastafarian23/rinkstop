/**
 * src/components/ClaimCtaLink.tsx
 *
 * A client island for a listing CTA that lives inside a SERVER component.
 *
 * WHY THIS EXISTS (2026-11-13, conversion assessment):
 *   The rink detail page's primary "Claim this rink →" CTA is the single
 *   most prominent conversion link on the highest-traffic page family
 *   (78,010 listing views in 30 days). It is rendered inside a server
 *   component, so it fired NO funnel event — `listing_cta_clicked` and
 *   `claim_button_clicked` were both 0 for the whole period, even though
 *   the components that DO fire them (`ClaimNudgeButtons`,
 *   `ClaimThisListing`) only render in certain states.
 *
 *   The event list already allows `listing_cta_clicked`; nothing was
 *   dispatching it for this link.
 *
 * WHAT IT DOES
 *   Renders the same link the server component rendered, plus an onClick
 *   that fires the funnel event via `trackClient` (sendBeacon), so the
 *   event survives the navigation away.
 *
 * It deliberately changes NOTHING about the link's href, label, or
 * styling — it is the same CTA, instrumented.
 */

'use client';

import Link from 'next/link';
import { trackClient } from '@/lib/client-track';

export default function ClaimCtaLink({
  href,
  label,
  entityType,
  entityId,
  entitySlug,
  ctaLocation,
  style,
}: {
  href: string;
  label: string;
  entityType: 'rink' | 'team' | 'league' | 'player' | 'person';
  entityId: string;
  entitySlug?: string | null;
  ctaLocation: string;
  style?: React.CSSProperties;
}) {
  const fire = () => {
    trackClient('listing_cta_clicked', {
      listing_type: entityType,
      listing_id: entityId,
      listing_slug: entitySlug ?? null,
      cta_location: ctaLocation,
      destination: 'claim',
    });
    trackClient('claim_button_clicked', {
      listing_type: entityType,
      listing_id: entityId,
      listing_slug: entitySlug ?? null,
      cta_location: ctaLocation,
    });
  };

  return (
    <Link href={href} onClick={fire} data-claim-cta={ctaLocation} style={style}>
      {label}
    </Link>
  );
}
