// src/app/profile/[slug]/passport/VerificationBadge.tsx
// Shared verification badge for passport sections.
// Source values: 'self_reported' | 'league_verified' | 'coach_verified' | 'platform_verified'

import type { CSSProperties } from 'react';

type Source = 'self_reported' | 'league_verified' | 'coach_verified' | 'platform_verified' | string;

const STYLES: Record<string, { bg: string; color: string; label: string }> = {
  self_reported:     { bg: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.55)', label: 'Self-reported' },
  league_verified:   { bg: 'rgba(0,150,80,0.18)',     color: '#009650',               label: 'League verified' },
  coach_verified:    { bg: 'rgba(255,184,28,0.18)',   color: '#FFB81C',               label: 'Coach verified' },
  platform_verified: { bg: 'rgba(0,150,80,0.18)',     color: '#009650',               label: 'Platform verified' },
};

export function VerificationBadge({ source, verifiedAt }: { source: Source; verifiedAt?: string | null }) {
  const s = STYLES[source] ?? STYLES.self_reported;
  const style: CSSProperties = {
    flexShrink: 0,
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    padding: '4px 8px',
    borderRadius: 6,
    background: s.bg,
    color: s.color,
    whiteSpace: 'nowrap',
  };
  return (
    <span style={style} title={verifiedAt ? `Verified ${new Date(verifiedAt).toLocaleDateString()}` : undefined}>
      {s.label}
    </span>
  );
}