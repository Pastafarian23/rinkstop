'use client';

import React from 'react';

/**
 * IdentityVerified — the ONLY check on RinkStop.
 *
 * Per Arnel (2026-06-17): "The tiers should be indicated by text with tier
 * level, not checks or shields. Verification is its own entity and that is
 * the only way to get a verified check."
 *
 * Tier pills (Free/Verified Identity/Identity Plus/Club/Business Listing/etc.) are text-only. This
 * checkmark appears ONLY when a user has passed Didit's government ID +
 * selfie verification AND the verification has not expired.
 *
 * Visual:
 * - Navy background (brand primary, #041E42)
 * - White check
 * - Hover tooltip shows verification date and expiry
 *
 * Used by:
 * - Public profile header (`/profile/[slug]`)
 * - ClaimedBy component (when a claim's owner is identity-verified)
 * - /dashboard/messages thread header (sender's verification)
 * - /claim-your-listing post-claim follow-up
 */

interface IdentityVerifiedProps {
  size?: number;
  verifiedAt?: string;     // ISO timestamp — used in tooltip
  expiresAt?: string;      // ISO timestamp — used in tooltip
  showTooltip?: boolean;   // default true; false for tight UI like DM threads
}

export function IdentityVerified({
  size = 18,
  verifiedAt,
  expiresAt,
  showTooltip = true,
}: IdentityVerifiedProps) {
  const tooltip = showTooltip
    ? `Identity verified with government ID${
        verifiedAt ? ` on ${new Date(verifiedAt).toLocaleDateString()}` : ''
      }${expiresAt ? ` · expires ${new Date(expiresAt).toLocaleDateString()}` : ''}`
    : undefined;

  return (
    <span
      title={tooltip}
      aria-label={tooltip || 'Identity verified'}
      data-testid="identity-verified"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        background: '#041E42', // navy
        border: '1.5px solid #FFB81C', // gold border so the check pops on dark backgrounds
        borderRadius: '50%',
        marginLeft: 6,
        verticalAlign: 'middle',
        flexShrink: 0,
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#FFB81C" // gold check on navy
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ width: size * 0.55, height: size * 0.55 }}
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </span>
  );
}
