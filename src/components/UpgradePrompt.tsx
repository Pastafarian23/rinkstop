'use client';

import Link from 'next/link';

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
    </div>
  );
}
