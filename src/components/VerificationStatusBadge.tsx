'use client';

import React from 'react';

/**
 * src/components/VerificationStatusBadge.tsx
 *
 * WS25 (2026-08-23): three-state verification badge for public listings.
 *
 * Used by:
 * - ClaimedBy component (entity pages)
 * - Direct listing page surfaces (rink/team/league/player)
 *
 * Renders a small inline pill with status text. Color matches the
 * verification status:
 *   - 'verified'             → green check + 'Verified owner'
 *   - 'pending_verification' → yellow dot  + 'Pending Verification'
 *   - 'unverified'           → gray dot   + 'Listed' (default)
 */

export type VerificationStatus = 'unverified' | 'pending_verification' | 'verified';

interface VerificationStatusBadgeProps {
  status: VerificationStatus;
  size?: 'sm' | 'md';
}

const STATUS_CONFIG: Record<VerificationStatus, { label: string; bg: string; color: string; border: string; dot: string }> = {
  unverified: {
    label: 'Listed',
    bg: 'rgba(136,136,136,0.12)',
    color: 'rgba(255,255,255,0.6)',
    border: 'rgba(136,136,136,0.3)',
    dot: 'rgba(136,136,136,0.6)',
  },
  pending_verification: {
    label: 'Pending Verification',
    bg: 'rgba(255,184,28,0.12)',
    color: '#FFB81C',
    border: 'rgba(255,184,28,0.4)',
    dot: '#FFB81C',
  },
  verified: {
    label: 'Verified owner',
    bg: 'rgba(20,184,166,0.12)',
    color: '#14B8A6',
    border: 'rgba(20,184,166,0.4)',
    dot: '#14B8A6',
  },
};

export function VerificationStatusBadge({ status, size = 'sm' }: VerificationStatusBadgeProps) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.unverified;
  const padding = size === 'md' ? '0.25rem 0.6rem' : '0.15rem 0.5rem';
  const fontSize = size === 'md' ? '0.6875rem' : '0.625rem';

  return (
    <span
      data-testid="verification-status-badge"
      data-status={status}
      title={
        status === 'verified'
          ? 'Owner has completed identity verification.'
          : status === 'pending_verification'
          ? 'Owner claimed this listing but has not completed verification yet.'
          : 'Listing is in the directory; no verified owner yet.'
      }
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding,
        fontSize,
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
        borderRadius: '99px',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: size === 'md' ? 8 : 6,
          height: size === 'md' ? 8 : 6,
          borderRadius: '50%',
          background: cfg.dot,
          flexShrink: 0,
        }}
      />
      {cfg.label}
    </span>
  );
}
