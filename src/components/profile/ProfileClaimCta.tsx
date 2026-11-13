/**
 * src/components/profile/ProfileClaimCta.tsx
 *
 * The contextual "this is you?" CTA on a unified person profile.
 *
 * WHY THIS EXISTS (2026-11-13, conversion assessment):
 *   The unified profile went live on 2026-11-12 with 11,386 canonical
 *   profile pages — and NOT ONE of them had a registration, claim, or
 *   upgrade CTA. The page was a read-only identity record. It is also
 *   the highest-intent surface on the site: a coach, scout, or parent
 *   arrives from a search because they are looking for a specific person,
 *   and the Hockey Passport tier ($24.99/yr) is sold on exactly that
 *   promise — "One URL a coach, scout, or scholarship committee can open."
 *
 *   The product promise was on the page. The ask was not.
 *
 * WHAT IT DOES
 *   Renders a claim CTA that deep-links into the EXISTING claim flow at
 *   /claim-your-listing, pre-filled with the right entity type, the right
 *   entity id, and the person's name. It creates NO claim, asserts NO
 *   ownership, and performs NO verification — it only routes the visitor
 *   into the workflow that already handles all of that.
 *
 *   The entity id is the `rinkstop_players` source id, which is the
 *   `players.id` UUID — the exact identifier POST /api/claims resolves
 *   via resolveClaimEntity('player', id). Verified against the live DB.
 *
 * WHO SEES IT
 *   Only a person who has a CLAIMABLE player record (a `rinkstop_players`
 *   source). A person whose only records are league-managed (nhl_players,
 *   nhl_coaching_staff) has nothing to claim — showing them a claim CTA
 *   would be a dead end, which is the same mistake the directory pages
 *   already avoid with their `claimable` flag gate.
 *
 * STYLING
 *   Navy/gold, matching the rest of RinkStop's public pages:
 *   card bg rgba(0,0,0,0.25) · border rgba(255,184,28,0.35) · gold #FFB81C.
 */

'use client';

import Link from 'next/link';
import { trackClient } from '@/lib/client-track';
import type { UnifiedPerson } from '@/lib/unified-profile';

export default function ProfileClaimCta({ person }: { person: UnifiedPerson }) {
  // The claimable record is the `rinkstop_players` source — its sourceId is
  // the `players.id` UUID that the claims API resolves.
  const playerSource = person.sources.find((s) => s.source === 'rinkstop_players');
  if (!playerSource?.sourceId) return null;

  const name = person.displayName || playerSource.name || '';
  const href =
    `/claim-your-listing?type=player` +
    `&id=${encodeURIComponent(playerSource.sourceId)}` +
    `&name=${encodeURIComponent(name)}` +
    `&q=${encodeURIComponent(name)}`;

  // Fire the funnel's third step (listing view → claim CTA click → claim
  // submitted). `claim_button_clicked` is the event the rest of the claim
  // CTAs already use, so this CTA lands in the same series. Without it the
  // profile cohort was invisible between the page view and the claim.
  const fireCtaClick = () => {
    trackClient('claim_button_clicked', {
      listing_type: 'person',
      listing_id: person.id,
      listing_slug: person.slug,
      cta_location: 'unified_profile',
      entity_id: playerSource.sourceId,
    });
  };

  return (
    <div
      style={{
        background: 'rgba(0,0,0,0.25)',
        border: '1px solid rgba(255,184,28,0.35)',
        borderRadius: 12,
        padding: '1.25rem 1.5rem',
        marginBottom: '1.25rem',
      }}
    >
      <div
        style={{
          fontFamily: "'Bebas Neue', Impact, sans-serif",
          fontSize: '1.25rem',
          letterSpacing: '0.06em',
          color: '#FFB81C',
          marginBottom: '0.4rem',
        }}
      >
        Is this you?
      </div>
      <p
        style={{
          fontSize: '0.875rem',
          lineHeight: 1.55,
          color: 'rgba(255,255,255,0.7)',
          margin: '0 0 0.9rem',
        }}
      >
        Claim this player profile to add it to your Hockey Passport, verify your identity, and
        keep your hockey record in one place a coach or scout can open. Claiming is free — you
        only pay if you want the full Passport.
      </p>
      <Link
        href={href}
        onClick={fireCtaClick}
        data-testid="profile-claim-cta"
        style={{
          display: 'inline-block',
          background: '#FFB81C',
          color: '#041E42',
          fontWeight: 800,
          fontSize: '0.9375rem',
          padding: '0.7rem 1.25rem',
          borderRadius: 8,
          textDecoration: 'none',
        }}
      >
        Claim &amp; verify this profile →
      </Link>
    </div>
  );
}
