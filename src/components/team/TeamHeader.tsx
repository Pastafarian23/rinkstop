import Link from 'next/link';
import { countryFlag, formatAgeCategory } from '@/lib/team';

export interface TeamHeaderProps {
  name: string;
  shortName?: string | null;
  countryCode?: string | null;
  homeCity?: string | null;
  homeCountry?: string | null;
  ageCategory: string;
  ageLabel?: string | null;
  ageMin?: number | null;
  ageMax?: number | null;
  seasonLabel?: string | null;
  level?: string | null;
  slug: string;
  memberCount: number;
  isAdmin: boolean;
}

export function TeamHeader({
  name,
  shortName,
  countryCode,
  homeCity,
  homeCountry,
  ageCategory,
  ageLabel,
  ageMin,
  ageMax,
seasonLabel,
  level,
  slug,
  memberCount,
  isAdmin,
}: TeamHeaderProps) {
  const flag = countryFlag(countryCode);
  const location = [homeCity, homeCountry].filter(Boolean).join(', ');

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #041E42 0%, #0a2d5a 100%)',
        borderRadius: 12,
        padding: '1.5rem 1.75rem',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        gap: '1.25rem',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 12,
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 32,
          flexShrink: 0,
        }}
        aria-hidden
      >
        🏒
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1
          style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: '1.75rem',
            letterSpacing: '0.05em',
            margin: '0 0 0.25rem',
            color: '#fff',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {flag} {name}
        </h1>
        <div
          style={{
            color: 'rgba(255,255,255,0.65)',
            fontSize: '0.875rem',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem 1rem',
            alignItems: 'center',
          }}
        >
          {shortName && (
            <span>
              <strong style={{ color: 'rgba(255,255,255,0.85)' }}>{shortName}</strong>
            </span>
          )}
          {location && <span>📍 {location}</span>}
          <span>👥 {memberCount} member{memberCount === 1 ? '' : 's'}</span>
          {ageLabel && ageLabel.trim() ? (
            <span>
              {ageLabel.trim()}
              {ageMin != null && ageMax != null && ` (${ageMin}–${ageMax})`}
            </span>
          ) : (
            <span>{formatAgeCategory(ageCategory)}</span>
          )}
{seasonLabel && <span>🏆 {seasonLabel}</span>}
          {level && <span>Level: {level}</span>}
        </div>
      </div>
      {isAdmin && (
        <a
          href={`/dashboard/team/${slug}/settings`}
          style={{
            padding: '0.5rem 1rem',
            background: 'rgba(20,184,166,0.10)',
            color: '#14B8A6',
            border: '1px solid rgba(20,184,166,0.35)',
            borderRadius: 6,
            textDecoration: 'none',
            fontSize: '0.8rem',
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          ⚙️ Settings
        </a>
      )}
    </div>
  );
}
