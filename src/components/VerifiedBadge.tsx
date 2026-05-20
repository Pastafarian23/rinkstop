'use client';

import { useState } from 'react';

export type BadgeTier = 'free' | 'verified' | 'elite';

interface BadgeConfig {
  tier: BadgeTier;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}

const BADGE_CONFIGS: Record<BadgeTier, BadgeConfig> = {
  free: {
    tier: 'free',
    label: 'Free',
    color: '#888',
    bgColor: 'rgba(136,136,136,0.1)',
    borderColor: 'rgba(136,136,136,0.3)',
    description: 'Basic profile',
  },
  verified: {
    tier: 'verified',
    label: 'Verified Recruit',
    color: '#14B8A6',
    bgColor: 'rgba(20,184,166,0.12)',
    borderColor: 'rgba(20,184,166,0.4)',
    description: 'Identity verified, contact visible to scouts',
  },
  elite: {
    tier: 'elite',
    label: 'Elite Recruit',
    color: '#F59E0B',
    bgColor: 'rgba(245,158,11,0.12)',
    borderColor: 'rgba(245,158,11,0.5)',
    description: 'Featured, full video gallery, priority search',
  },
};

interface VerifiedBadgeProps {
  tier: BadgeTier;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  interactive?: boolean;
}

export function VerifiedBadge({ tier, size = 'md', showLabel = true, interactive = false }: VerifiedBadgeProps) {
  const config = BADGE_CONFIGS[tier];
  if (tier === 'free') return null;

  const sizeStyles = {
    sm: { fontSize: '0.5625rem', padding: '0.15rem 0.4rem', gap: '0.25rem' },
    md: { fontSize: '0.625rem', padding: '0.2rem 0.5rem', gap: '0.3rem' },
    lg: { fontSize: '0.6875rem', padding: '0.25rem 0.6rem', gap: '0.375rem' },
  };

  const iconSizes = { sm: 10, md: 12, lg: 14 };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: sizeStyles[size].gap,
        padding: sizeStyles[size].padding,
        borderRadius: '4px',
        fontSize: sizeStyles[size].fontSize,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase' as const,
        color: config.color,
        background: config.bgColor,
        border: `1px solid ${config.borderColor}`,
        cursor: interactive ? 'pointer' : 'default',
        transition: 'all 0.2s',
        userSelect: 'none' as const,
      }}
      title={config.description}
    >
      {/* Checkmark shield icon */}
      <svg
        width={iconSizes[size]}
        height={iconSizes[size]}
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        {tier === 'elite' ? (
          /* Star for elite */
          <path
            d="M8 1l1.9 3.8 4.1.6-3 2.9.7 4.1L8 10.3l-3.7 1.9.7-4.1-3-2.9 4.1-.6L8 1z"
            fill={config.color}
          />
        ) : (
          /* Shield check for verified */
          <path
            d="M8 1L2 3.5v4C2 10.5 4.8 13.4 8 14.5c3.2-1.1 6-4 6-7v-4L8 1z"
            stroke={config.color}
            strokeWidth="1.5"
            fill={config.bgColor}
          />
        )}
      </svg>
      {showLabel && config.label}
    </span>
  );
}

export function TierBadgeSelect({
  value,
  onChange,
  disabled,
}: {
  value: BadgeTier;
  onChange: (t: BadgeTier) => void;
  disabled?: boolean;
}) {
  return (
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
      {(Object.keys(BADGE_CONFIGS) as BadgeTier[]).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          disabled={disabled}
          style={{
            padding: '0.35rem 0.75rem',
            borderRadius: '4px',
            fontSize: '0.6875rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase' as const,
            border: `1px solid ${value === t ? BADGE_CONFIGS[t].borderColor : 'var(--border)'}`,
            background: value === t ? BADGE_CONFIGS[t].bgColor : 'transparent',
            color: value === t ? BADGE_CONFIGS[t].color : '#555',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
            transition: 'all 0.2s',
          }}
        >
          {BADGE_CONFIGS[t].label}
        </button>
      ))}
    </div>
  );
}

export { BADGE_CONFIGS };
export type { BadgeConfig };