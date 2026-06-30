'use client';

import React from 'react';

// Tier names now support both Personal and Business tracks
export type TierId = 'free' | 'roster' | 'roster_plus' | 'pro' | 'premium' | 'business_starter' | 'business_pro' | 'business_premium' | 'enterprise';

const TIER_STYLES: Record<TierId, { bg: string; border: string; text: string; label: string }> = {
  free:           { bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.15)', text: 'rgba(255,255,255,0.6)', label: 'Free' },
  roster:         { bg: 'rgba(255,184,28,0.12)',  border: 'rgba(255,184,28,0.4)',   text: '#FFB81C',                label: 'Roster Starter' },
  roster_plus:    { bg: 'rgba(255,184,28,0.18)',  border: 'rgba(255,184,28,0.5)',   text: '#FFB81C',                label: 'Roster Pro' },
  pro:            { bg: 'rgba(20,184,166,0.12)',  border: 'rgba(20,184,166,0.4)',   text: '#14B8A6',                label: 'Roster Premium' },
  premium:        { bg: 'rgba(20,184,166,0.12)',  border: 'rgba(20,184,166,0.4)',   text: '#14B8A6',                label: 'Roster Premium' },
  business_starter: { bg: 'rgba(255,184,28,0.12)', border: 'rgba(255,184,28,0.4)',   text: '#FFB81C',                label: 'Business Starter' },
  business_pro:   { bg: 'rgba(20,184,166,0.12)',  border: 'rgba(20,184,166,0.4)',   text: '#14B8A6',                label: 'Business Pro' },
  business_premium: { bg: 'rgba(200,16,46,0.12)', border: 'rgba(200,16,46,0.4)',    text: '#C8102E',                label: 'Business Premium' },
  enterprise:     { bg: 'linear-gradient(135deg, rgba(17,24,39,0.9), rgba(0,0,0,0.9))', border: 'rgba(255,255,255,0.4)', text: '#fff', label: 'Enterprise' },
};

export function TierBadge({ tier, size = 'sm' }: { tier: TierId | string; size?: 'xs' | 'sm' | 'md' }) {
  const style = TIER_STYLES[tier as TierId] || TIER_STYLES.free;
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
      {style.label}
    </span>
  );
}

// VerifiedCheckmark component is gone as of 2026-06-17 (Arnel directive).
// The teal checkmark was previously awarded by tier (Pro/Premium/Enterprise
// all got it), which conflated "paid for tier" with "verified identity."
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