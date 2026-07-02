'use client';

import React from 'react';
import { TierName, getTierLabel } from '@/lib/pricing';

// TierBadge supports any string. New canonical TierNames render with full
// styling from lib/pricing.ts. Legacy DB-stored values (roster, pro, etc.)
// fall back to getTierLabel() which surfaces "Verified Identity (legacy)"
// style strings so we never silently drop information.
export type TierId = TierName | string;

const TIER_STYLES_NEW: Record<string, { bg: string; border: string; text: string }> = {
  // Identity
  free:               { bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.15)', text: 'rgba(255,255,255,0.6)' },
  verified_identity:  { bg: 'rgba(255,184,28,0.18)',  border: 'rgba(255,184,28,0.5)',   text: '#FFB81C' },
  identity_plus:      { bg: 'rgba(255,184,28,0.25)',  border: 'rgba(255,184,28,0.6)',   text: '#FFB81C' },
  // Organization
  club_starter:       { bg: 'rgba(200,16,46,0.10)',   border: 'rgba(200,16,46,0.4)',    text: '#C8102E' },
  club_pro:           { bg: 'rgba(200,16,46,0.15)',   border: 'rgba(200,16,46,0.5)',    text: '#C8102E' },
  club_elite:         { bg: 'rgba(200,16,46,0.22)',   border: 'rgba(200,16,46,0.6)',    text: '#C8102E' },
  league:             { bg: 'rgba(200,16,46,0.10)',   border: 'rgba(200,16,46,0.4)',    text: '#C8102E' },
  federation:         { bg: 'linear-gradient(135deg, rgba(17,24,39,0.9), rgba(0,0,0,0.9))', border: 'rgba(255,255,255,0.4)', text: '#fff' },
  // Business listings
  business_listing:   { bg: 'rgba(20,184,166,0.12)',  border: 'rgba(20,184,166,0.4)',   text: '#14B8A6' },
  business_plus:      { bg: 'rgba(20,184,166,0.22)',  border: 'rgba(20,184,166,0.6)',   text: '#14B8A6' },
};

// Legacy DB-stored tier values (pre-2026-07-02). All map to muted yellow
// styling so the legacy pill is visually distinct from new tiers.
const LEGACY_STYLE = { bg: 'rgba(255,184,28,0.08)', border: 'rgba(255,184,28,0.3)', text: 'rgba(255,184,28,0.7)' };

export function TierBadge({ tier, size = 'sm' }: { tier: TierId; size?: 'xs' | 'sm' | 'md' }) {
  const style = TIER_STYLES_NEW[tier] || LEGACY_STYLE;
  const label = getTierLabel(tier);
  const fontSize = size === 'xs' ? 10 : size === 'md' ? 14 : 12;
  const padding = size === 'xs' ? '0.1rem 0.5rem' : size === 'md' ? '0.4rem 1rem' : '0.25rem 0.75rem';
  return (
    <span
      style={{
        display: 'inline-block',
        padding,
        background: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
        borderRadius: 999,
        fontSize,
        fontWeight: 600,
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}

// VerifiedCheckmark component is gone as of 2026-06-17 (Arnel directive).
// The teal checkmark was previously awarded by tier (top paid plans all
// got it), which conflated "paid for tier" with "verified identity."
// The replacement is <IdentityVerified /> in src/components/IdentityVerified.tsx
// — a navy check that appears ONLY when a user has passed Didit's
// government-ID + selfie KYC and the verification has not expired.
// Tier pills (this file's <TierBadge />) are text-only, no check.

export function FoundingMemberBadge({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const padding = size === 'md' ? '0.35rem 0.85rem' : '0.2rem 0.65rem';
  const fontSize = size === 'md' ? 13 : 11;
  return (
    <span
      title="Founding Member — one of the first 500 paying members"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding,
        background: 'linear-gradient(135deg, rgba(255,184,28,0.18) 0%, rgba(255,140,0,0.12) 100%)',
        color: '#FFB81C',
        border: '1px solid rgba(255,184,28,0.5)',
        borderRadius: 999,
        fontSize,
        fontWeight: 700,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#FFB81C" style={{ width: fontSize + 2, height: fontSize + 2 }}>
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
      Founding Member
    </span>
  );
}