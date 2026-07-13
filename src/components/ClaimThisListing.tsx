'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
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

async function openCheckout(tier: 'verified_identity' | 'identity_plus' | 'business_listing' | 'business_plus' | 'club_starter' | 'club_pro' | 'club_elite', context: string) {
  try {
    const res = await fetch('/api/tier/upgrade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier, context }),
    });
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = `/login?redirect_url=${encodeURIComponent(window.location.pathname + window.location.search)}`;
        return;
      }
      window.location.href = `/pricing?tier=${tier}`;
      return;
    }
    if (data.url) window.location.href = data.url;
  } catch {
    window.location.href = `/pricing?tier=${tier}`;
  }
}

function contactSales() {
  window.location.href = '/partner?source=claims-cap';
}

/**
 * "Claim this listing" CTA. Renders on unclaimed entity pages (rink, team, league, player).
 *
 * State is computed server-side in the *Mount wrapper and passed in as `state`:
 *   - signed_out: Not logged in → "Sign in to claim this rink"
 *   - claim_form: Logged in, tier has room → "Claim this rink" form
 *   - free:       Logged in, Free tier → "Upgrade to claim this rink" (Starter is the entry point)
 *   - at_cap:     Logged in, paid tier but at the cap → "At cap — upgrade to Pro"
 *   - pending:    Logged in, paid tier, an unapproved claim exists → "Claim pending review"
 *
 * Pairs with the existing `ClaimedBy` component, which renders in the same slot
 * when a listing IS claimed. The two are mutually exclusive by intent.
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
  // Local form state for the inline claim form.
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<
    | { kind: 'idle' }
    | { kind: 'success' }
    | { kind: 'error'; message: string }
  >({ kind: 'idle' });
  const [expanded, setExpanded] = useState(false);

  const noun = entityType; // "rink", "team", "league", "player"
  const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  const containerStyle: React.CSSProperties = {
    marginTop: 12,
    marginBottom: 12,
    padding: '1rem 1.25rem',
    background: 'rgba(255,184,28,0.06)',
    border: '1px dashed rgba(255,184,28,0.4)',
    borderRadius: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  };

  if (result.kind === 'success') {
    return (
      <div style={containerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>✅</span>
          <div>
            <div style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>
              Claim submitted for {entityName}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 2 }}>
              We review claims within 2 business days. You can track the status in your{' '}
              <Link href="/dashboard/claims" style={{ color: '#FFB81C', textDecoration: 'underline' }}>
                claim dashboard
              </Link>
              .
            </div>
          </div>
        </div>
        {/* Why upgrade? prompt — shown to users who have room (claim_form, free, pending).
            Hidden for at-cap users (any tier). Compact link, not a big panel. */}
        {state.kind !== 'at_cap' && (
          <div style={{
            marginTop: 4,
            padding: '0.65rem 0.85rem',
            background: 'rgba(200,16,46,0.08)',
            border: '1px solid rgba(200,16,46,0.25)',
            borderRadius: 8,
            fontSize: 12,
            color: '#d1d5db',
            lineHeight: 1.5,
          }}>
            <strong style={{ color: '#FFB81C' }}>Want a Premium tier with up to 25 claims and featured placement?</strong>{' '}
            <Link href="/pricing?tier=verified_identity" style={{ color: '#FFB81C', textDecoration: 'underline', fontWeight: 600 }}>
              See tier benefits →
            </Link>
          </div>
        )}
      </div>
    );
  }

  // === SIGNED OUT ===
  if (state.kind === 'signed_out') {
    const pathname = usePathname() || '/';
    const search = useSearchParams()?.toString() || '';
    const currentPath = search ? `${pathname}?${search}` : pathname;
    return (
      <div style={containerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 18 }}>🏒</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#FFB81C', fontWeight: 700, fontSize: 14 }}>
              Own or run this {noun}?
            </div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 2 }}>
              Claim this listing to add your program hours, contact info, and updates — and stop the next stranger from editing it out from under you.
            </div>
          </div>
          <Link
            href={`/login?redirect_url=${encodeURIComponent(currentPath)}`}
            style={{
              background: '#FFB81C',
              color: '#041E42',
              padding: '8px 14px',
              borderRadius: 8,
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: 13,
              whiteSpace: 'nowrap',
            }}
          >
            Sign in to claim — from {formatTierPrice(DEFAULT_TIER_BY_ENTITY[entityType])}/yr
          </Link>
        </div>
      </div>
    );
  }

  // === FREE TIER ===
  if (state.kind === 'free') {
    return (
      <div style={containerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 18 }}>🏒</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#FFB81C', fontWeight: 700, fontSize: 14 }}>
              Run this {noun}? Claim it on RinkStop.
            </div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 2 }}>
              Claim it now — Verified Identity unlocks profile claims, Club Pro covers up to 150 players, Business Plus unlocks multiple listings, and Federation covers enterprise-scale orgs.
            </div>
          </div>
          <button
            onClick={() => openCheckout(state.recommendedTier || DEFAULT_TIER_BY_ENTITY[entityType], 'inline-claim-free')}
            style={{
              background: '#FFB81C',
              color: '#041E42',
              padding: '8px 14px',
              borderRadius: 8,
              border: 'none',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: 13,
              whiteSpace: 'nowrap',
              cursor: 'pointer',
            }}
          >
            Unlock claim — from {formatTierPrice(DEFAULT_TIER_BY_ENTITY[entityType])}/yr →
          </button>
        </div>
      </div>
    );
  }

  // === AT CAP ===
  if (state.kind === 'at_cap') {
    return (
      <div style={containerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 18 }}>🏒</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#FFB81C', fontWeight: 700, fontSize: 14 }}>
              {state.recommendedTier === 'federation' || state.recommendedTier === 'league' ? `You've reached your tier's claim limit. Federation covers enterprise-scale organizations.` : `You've claimed ${state.maxClaims} ${state.maxClaims === 1 ? 'listing' : 'listings'} on ${titleCase(state.tier)}.`}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 2 }}>
              Club Pro covers up to 150 players with multiple teams. For leagues, brands, or organizations that need more, contact sales for Federation.
            </div>
          </div>
          <button
            onClick={() => state.recommendedTier === 'federation' || state.recommendedTier === 'league' ? contactSales() : openCheckout('identity_plus', 'inline-claim-cap')}
            style={{
              background: '#C8102E',
              color: '#fff',
              padding: '8px 14px',
              borderRadius: 8,
              border: 'none',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: 13,
              whiteSpace: 'nowrap',
              cursor: 'pointer',
            }}
          >
            {state.recommendedTier === 'federation' || state.recommendedTier === 'league' ? 'Contact Sales →' : 'Upgrade to Identity Plus →'}
          </button>
        </div>
      </div>
    );
  }

  // === PENDING CLAIM ALREADY ===
  if (state.kind === 'pending') {
    return (
      <div style={containerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>⏳</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#FFB81C', fontWeight: 700, fontSize: 14 }}>
              Your claim for {entityName} is pending review.
            </div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 2 }}>
              We usually decide within 2 business days. Track the status in your{' '}
              <Link href="/dashboard/claims" style={{ color: '#FFB81C', textDecoration: 'underline' }}>
                claim dashboard
              </Link>
              .
            </div>
          </div>
        </div>
      </div>
    );
  }

  // === CLAIM FORM (paid tier with room) ===
  const submit = async () => {
    if (!reason.trim()) {
      setResult({ kind: 'error', message: 'Tell us why you should own this listing.' });
      return;
    }
    setSubmitting(true);
    setResult({ kind: 'idle' });
    try {
      const res = await fetch('/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claim_type: entityType === 'league' ? 'team' : entityType, // leagues aren't a first-class claim type yet
          entity_id: entityId,
          entity_name: entityName,
          reason: reason.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg =
          data?.error ||
          (res.status === 403 && data?.error === 'claim_limit_reached'
            ? 'You have reached your tier\'s claim limit. Upgrade to a higher tier or contact sales for Federation.'
            : `Claim submission failed (${res.status})`);
        setResult({ kind: 'error', message: msg });
        return;
      }
      setResult({ kind: 'success' });
    } catch (err) {
      setResult({ kind: 'error', message: 'Network error. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontSize: 18 }}>🏒</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#FFB81C', fontWeight: 700, fontSize: 14 }}>
            Own or run {entityName}?
          </div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 2 }}>
            Claim this listing to edit the details, post schedule updates, respond to reviews, and unlock the lead-capture form. We review claims within 2 business days.
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            background: '#FFB81C',
            color: '#041E42',
            border: 0,
            padding: '8px 14px',
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {expanded ? 'Close' : 'Claim this ' + noun}
        </button>
      </div>
      {expanded && (
        <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 600 }}>
            Why should we approve your claim?
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={`e.g. I'm the GM of ${entityName} and I run the rink operations. I can verify via ${entityType === 'rink' ? 'the building\'s utility bill' : entityType === 'team' ? 'our league-issued coach credential' : 'my professional bio'}.`}
            rows={3}
            disabled={submitting}
            style={{
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 6,
              color: '#fff',
              padding: '8px 10px',
              fontSize: 13,
              fontFamily: 'inherit',
              resize: 'vertical',
            }}
          />
          {result.kind === 'error' && (
            <div style={{ color: '#fca5a5', fontSize: 12 }}>{result.message}</div>
          )}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={submit}
              disabled={submitting}
              style={{
                background: submitting ? 'rgba(255,184,28,0.5)' : '#FFB81C',
                color: '#041E42',
                border: 0,
                padding: '8px 16px',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 13,
                cursor: submitting ? 'wait' : 'pointer',
              }}
            >
              {submitting ? 'Submitting…' : 'Submit claim'}
            </button>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
              We email you when a reviewer responds.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
