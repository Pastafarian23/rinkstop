'use client';

import Link from 'next/link';
import {
  FOUNDING_PROMO_MAX_REDEMPTIONS,
  FOUNDING_PROMO_PERCENT_OFF,
} from '@/lib/founding-promo';

interface UpgradePromptProps {
  /** Which pricing tab to send them to */
  forGroup: 'organization' | 'business';
  /** Human-readable name of the entity type */
  entityLabel: string;
  /** The minimum tier required, shown in the banner */
  requiredTier: string;
  /** Show the "current plan" version vs "not on this track" version */
  userCurrentTier?: string;
  /** Custom banner message override */
  message?: string;
}

export function UpgradePrompt({
  forGroup,
  entityLabel,
  requiredTier,
  userCurrentTier,
  message,
}: UpgradePromptProps) {
  const href = `/pricing?for=${forGroup}`;

  const defaultMessage = userCurrentTier
    ? `Your current plan (${userCurrentTier}) doesn't include ${entityLabel} management. Upgrade to unlock all management tools.`
    : `You need a ${requiredTier} plan to manage ${entityLabel}s on RinkStop. Upgrade to unlock all management tools.`;

  return (
    <div
      style={{
        background: 'rgba(20,184,166,0.06)',
        border: '1px solid rgba(20,184,166,0.35)',
        borderRadius: 10,
        padding: '0.875rem 1.125rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        flexWrap: 'wrap',
      }}
    >
      <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>🔒</span>
      <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)', flex: 1, lineHeight: 1.5 }}>
        {message ?? defaultMessage}
      </p>
      <Link
        href={href}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.45rem 0.875rem',
          background: '#14B8A6',
          color: '#0a0a0a',
          borderRadius: 6,
          fontWeight: 700,
          fontSize: '0.8rem',
          textDecoration: 'none',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        View plans →
      </Link>
      {/* 2026-11-13 (growth sprint): the Founding Member offer at the actual
          upgrade decision point. This banner is what a signed-in user sees
          when they hit a tool their plan does not include — the moment they
          are deciding whether to pay. Before this, the best incentive we
          had (50% off the first year) was only visible on the pricing page
          and a first-visit modal, never here. */}
      <div style={{ flexBasis: '100%', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.45 }}>
        Claiming is always free — this is for the management tools, not for the
        claim. New members get {FOUNDING_PROMO_PERCENT_OFF}% off their first year
        (first {FOUNDING_PROMO_MAX_REDEMPTIONS} members); the second year renews at
        the standard price.
      </div>
    </div>
  );
}
