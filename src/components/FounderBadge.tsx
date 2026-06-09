'use client';

import React from 'react';

type Size = 'xs' | 'sm' | 'md';

const PAD: Record<Size, string> = {
  xs: '0.15rem 0.5rem',
  sm: '0.25rem 0.75rem',
  md: '0.4rem 1rem',
};
const FONT: Record<Size, number> = { xs: 10, sm: 12, md: 14 };

/**
 * FounderBadge — for the project owner (super_admin role). Distinct from
 * "Founding Member" (paying early-access tier). Gold + red, with a crown
 * glyph and the founding date in the title for the OG founder.
 */
export function FounderBadge({
  size = 'sm',
  foundingDate,
}: {
  size?: Size;
  foundingDate?: string;
}) {
  const tooltip = foundingDate
    ? `Founder — owner of the project since ${foundingDate}`
    : 'Founder — project owner';
  return (
    <span
      title={tooltip}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: PAD[size],
        background: 'linear-gradient(135deg, rgba(255,184,28,0.22) 0%, rgba(200,16,46,0.22) 100%)',
        color: '#FFB81C',
        border: '1px solid rgba(255,184,28,0.55)',
        borderRadius: 999,
        fontSize: FONT[size],
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        boxShadow: '0 0 0 1px rgba(255,184,28,0.1) inset',
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="#FFB81C"
        style={{ width: FONT[size] + 2, height: FONT[size] + 2, flexShrink: 0 }}
      >
        <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm0 2h14v2H5v-2z" />
      </svg>
      Founder
    </span>
  );
}
