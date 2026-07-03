'use client';

// src/app/draft/nhl/[year]/YearDropdown.tsx
//
// Year switcher dropdown that matches the site aesthetic. Native <select>
// styled to blend with the dark glass card pattern used elsewhere on
// the draft pages.
//
// Props:
//   - basePath: e.g. "/draft/nhl"
//   - currentYear: the year the user is currently on (preselected)
//   - liveYear: the most recent year with full data
//   - years: full list of years in display order (newest first)
//
// On change, navigates to `${basePath}/${year}` using the Next.js router.

import { useRouter } from 'next/navigation';
import { useId } from 'react';

interface Props {
  basePath: string;
  currentYear: number;
  /** Years that have a full pick-data archive (status='live'). */
  liveYears: number[];
  years: number[];
}

const selectStyle: React.CSSProperties = {
  appearance: 'none',
  WebkitAppearance: 'none',
  MozAppearance: 'none',
  padding: '0.55rem 2.4rem 0.55rem 1rem',
  background: 'rgba(255,255,255,0.04)',
  color: '#fff',
  border: '1px solid rgba(255,255,255,0.18)',
  borderRadius: '8px',
  fontSize: '0.95rem',
  fontWeight: 600,
  fontFamily: '"Bebas Neue", "Arial Narrow", sans-serif',
  letterSpacing: '0.04em',
  cursor: 'pointer',
  backgroundImage:
    // Inline chevron — small SVG arrow
    "url(\"data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2210%22%20height%3D%226%22%20viewBox%3D%220%200%2010%206%22%3E%3Cpath%20fill%3D%22%23FFB81C%22%20d%3D%22M0%200l5%206%205-6z%22%2F%3E%3C%2Fsvg%3E\")",
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 0.85rem center',
  backgroundSize: '10px 6px',
};

const wrapStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  padding: '0.625rem 0.75rem',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '8px',
  flexWrap: 'wrap',
};

const labelStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.5)',
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  letterSpacing: '1px',
};

export default function YearDropdown({ basePath, currentYear, liveYears, years }: Props) {
  const router = useRouter();
  const selectId = useId();

  return (
    <div style={wrapStyle}>
      <label htmlFor={selectId} style={labelStyle}>
        Jump to year:
      </label>
      <select
        id={selectId}
        value={String(currentYear)}
        onChange={(e) => {
          const next = e.target.value;
          if (next && next !== String(currentYear)) {
            router.push(`${basePath}/${next}`);
          }
        }}
        style={selectStyle}
        aria-label="Select NHL draft year"
      >
        {years.map((y) => {
          const isLive = liveYears.includes(y);
          const isCurrent = y === currentYear;
          let suffix = '';
          if (isLive) suffix = ' ★ live';
          else if (!isCurrent) suffix = ' · coming soon';
          return (
            <option key={y} value={y} style={{ background: '#0b0b0b', color: '#fff' }}>
              {y}
              {suffix}
            </option>
          );
        })}
      </select>
      <span
        style={{
          color: 'rgba(255,184,28,0.85)',
          fontSize: '0.72rem',
          fontWeight: 600,
          letterSpacing: '0.04em',
        }}
      >
        {liveYears.includes(currentYear)
          ? 'Live archive'
          : currentYear > Math.max(...liveYears)
            ? 'Future'
            : 'Coming soon'}
      </span>
    </div>
  );
}
