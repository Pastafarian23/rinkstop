'use client';

import Link from 'next/link';
import { formatTierPrice } from '@/lib/pricing';

// Default tier per entity type (matches /claim-your-listing ClaimButton).
// Used to display the entry price on the CTA so visitors know what they'll pay.
const DEFAULT_TIER_BY_ENTITY: Record<ClaimEntityType, 'business_listing' | 'club_starter' | 'verified_identity'> = {
  rink: 'business_listing',
  team: 'club_starter',
  league: 'club_starter',
  player: 'verified_identity',
};

export type ClaimEntityType = 'rink' | 'team' | 'league' | 'player';

export type ClaimCtaState =
  | { kind: 'signed_out' }
  | { kind: 'claim_form'; entityType: ClaimEntityType; entityId: string; entityName: string }
  | { kind: 'free'; recommendedTier?: 'verified_identity' | 'identity_plus' | 'business_listing' | 'business_plus' | 'club_starter' | 'club_pro' | 'club_elite' }
  | { kind: 'at_cap'; tier: string; maxClaims: number; recommendedTier?: 'identity_plus' | 'business_plus' | 'club_elite' | 'league' | 'federation' }
  | { kind: 'pending'; tier: string };

/**
 * "Claim this listing" CTA. Renders on unclaimed entity pages (rink, team, league, player).
 *
 * State is computed server-side in the *Mount wrapper and passed in as `state`:
 *   - signed_out: Not logged in → "Sign in to claim" (deep-links via /login → /dashboard/claims?entity=...&id=...&name=...)
 *   - claim_form: Logged in, tier has room → "Continue your claim" (deep-links to /dashboard/claims?entity=...&id=...&name=...)
 *   - free:       Logged in, Free tier → "Claim it on RinkStop" (deep-links to /dashboard/claims where the form shows an upgrade CTA)
 *   - at_cap:     Logged in, paid tier but at the cap → "At cap — upgrade to Pro" (deep-links to /dashboard/claims where the form shows an upgrade CTA)
 *   - pending:    Logged in, paid tier, an unapproved claim exists → "Claim pending review" (deep-link to /dashboard/claims to see all)
 *
 * All paths funnel into the single /dashboard/claims form. This unifies the claim
 * flow so the listing identity (entity, id, name) is never lost between the
 * decision to claim and the actual submission. Tier-based upgrade CTAs and
 * auto-resume after Stripe checkout will be wired up in subsequent commits.
 *
 * Pairs with the existing `ClaimedBy` component, which renders in the same slot
 * when a listing IS claimed. The two are mutually exclusive by intent.
 *
 * Layout: mobile-first column. Text (with inline emoji) sits on top, CTA below.
 * Fixes the bug where on narrow viewports the row layout squeezed the text block
 * to a few characters wide and every word wrapped to its own line. Works on all
 * screen sizes; the desktop layout is slightly different (CTA below instead of
 * beside) but still readable and the CTA is more prominent.
 */
export default function ClaimThisListing({
  entityType,
  entityId,
  entityName,
  state,
}: {
  entityType: ClaimEntityType;
  entityName: string;
  entityId: string;
  state: ClaimCtaState;
}) {
  // The single canonical claim destination. All 5 states link here, either
  // directly (already signed in) or via /login?redirect_url= (signed out).
  // `intent=claim` is detected by /sign-up to render the price tier card
  // before the user creates an account. See src/app/sign-up/ClaimIntentCard.tsx.
  const claimDestination = `/dashboard/claims?intent=claim&entity=${entityType}&id=${encodeURIComponent(entityId)}&name=${encodeURIComponent(entityName)}&source=${entityType}&tier=${DEFAULT_TIER_BY_ENTITY[entityType]}`;

  const noun = entityType; // "rink", "team", "league", "player"
  const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  const signedOutHeadline = entityType === 'player'
    ? `Claim this player profile`
    : `Own or run this ${noun}?`;
  const signedOutDescription = entityType === 'player'
    ? `Verify your identity to manage this profile and control who can edit it.`
    : `Claim this listing to add your program hours, contact info, and updates — and stop the next stranger from editing it out from under you.`;

  // Outer container: column layout, full width.
  const containerStyle: React.CSSProperties = {
    marginTop: 12,
    marginBottom: 12,
    padding: '1rem 1.25rem',
    background: 'rgba(255,184,28,0.06)',
    border: '1px dashed rgba(255,184,28,0.4)',
    borderRadius: 10,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 10,
  };

  // First row: emoji + text content. Stays inline so the emoji hugs the headline.
  const headerRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
  };

  // Text takes remaining width on the row, with min-width 0 so long words can
  // break instead of pushing the row past the container.
  const textBlockStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
  };

  // CTA: full-width-ish (alignSelf flex-start), wraps inside if needed.
  // whiteSpace: 'normal' (not nowrap) so the text inside can break on very
  // narrow screens, but the button still tries to fit on one line.
  const ctaStyle: React.CSSProperties = {
    background: '#FFB81C',
    color: '#041E42',
    padding: '10px 16px',
    borderRadius: 8,
    textDecoration: 'none',
    fontWeight: 700,
    fontSize: 13,
    whiteSpace: 'nowrap',
    alignSelf: 'flex-start',
    maxWidth: '100%',
    textAlign: 'center',
  };

  const ctaDangerStyle: React.CSSProperties = {
    ...ctaStyle,
    background: '#C8102E',
    color: '#fff',
  };

  const headlineStyle: React.CSSProperties = {
    color: '#FFB81C',
    fontWeight: 700,
    fontSize: 14,
    lineHeight: 1.4,
  };

  const descriptionStyle: React.CSSProperties = {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    marginTop: 2,
    lineHeight: 1.5,
  };

  // === SIGNED OUT ===
  if (state.kind === 'signed_out') {
    return (
      <div style={containerStyle}>
        <div style={headerRowStyle}>
          <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1.4 }}>🏒</span>
          <div style={textBlockStyle}>
            <div style={headlineStyle}>
              {signedOutHeadline}
            </div>
            <div style={descriptionStyle}>
              {signedOutDescription}
            </div>
          </div>
        </div>
        <Link
          href={`/login?redirect_url=${encodeURIComponent(claimDestination)}`}
          style={ctaStyle}
        >
          Sign in to claim — from {formatTierPrice(DEFAULT_TIER_BY_ENTITY[entityType])}/yr
        </Link>
      </div>
    );
  }

  // === FREE TIER ===
  if (state.kind === 'free') {
    return (
      <div style={containerStyle}>
        <div style={headerRowStyle}>
          <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1.4 }}>🏒</span>
          <div style={textBlockStyle}>
            <div style={headlineStyle}>
              Run this {noun}? Claim it on RinkStop.
            </div>
            <div style={descriptionStyle}>
              Claim it now — Verified Identity unlocks profile claims, Club Pro covers up to 150 players, Business Plus unlocks multiple listings, and Federation covers enterprise-scale orgs.
            </div>
          </div>
        </div>
        <Link href={claimDestination} style={ctaStyle}>
          Unlock claim — from {formatTierPrice(DEFAULT_TIER_BY_ENTITY[entityType])}/yr →
        </Link>
      </div>
    );
  }

  // === AT CAP ===
  if (state.kind === 'at_cap') {
    return (
      <div style={containerStyle}>
        <div style={headerRowStyle}>
          <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1.4 }}>🏒</span>
          <div style={textBlockStyle}>
            <div style={headlineStyle}>
              {state.recommendedTier === 'federation' || state.recommendedTier === 'league' ? `You've reached your tier's claim limit. Federation covers enterprise-scale organizations.` : `You've claimed ${state.maxClaims} ${state.maxClaims === 1 ? 'listing' : 'listings'} on ${titleCase(state.tier)}.`}
            </div>
            <div style={descriptionStyle}>
              Club Pro covers up to 150 players with multiple teams. For leagues, brands, or organizations that need more, contact sales for Federation.
            </div>
          </div>
        </div>
        <Link href={claimDestination} style={ctaDangerStyle}>
          {state.recommendedTier === 'federation' || state.recommendedTier === 'league' ? 'Contact Sales →' : 'Upgrade to Identity Plus →'}
        </Link>
      </div>
    );
  }

  // === PENDING CLAIM ALREADY ===
  if (state.kind === 'pending') {
    return (
      <div style={containerStyle}>
        <div style={headerRowStyle}>
          <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1.4 }}>⏳</span>
          <div style={textBlockStyle}>
            <div style={headlineStyle}>
              Your claim for {entityName} is pending review.
            </div>
            <div style={descriptionStyle}>
              We usually decide within 2 business days.{' '}
              <Link href="/dashboard/claims" style={{ color: '#FFB81C', textDecoration: 'underline' }}>
                View your claims
              </Link>
              .
            </div>
          </div>
        </div>
      </div>
    );
  }

  // === CLAIM FORM (paid tier with room) ===
  // Now a deep-link to the unified /dashboard/claims form. The form itself
  // handles the submission + tier-cap checks + upgrade CTA.
  return (
    <div style={containerStyle}>
      <div style={headerRowStyle}>
        <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1.4 }}>🏒</span>
        <div style={textBlockStyle}>
          <div style={headlineStyle}>
            Own or run {entityName}?
          </div>
          <div style={descriptionStyle}>
            Claim this listing to edit the details, post schedule updates, respond to reviews, and unlock the lead-capture form. We review claims within 2 business days.
          </div>
        </div>
      </div>
      <Link
        href={claimDestination}
        style={ctaStyle}
      >
        Continue your claim →
      </Link>
    </div>
  );
}
