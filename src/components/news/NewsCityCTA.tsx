// src/components/news/NewsCityCTA.tsx
// Server component — Block C. Renders a "Hockey in {city}" banner
// with counts and a single CTA to the best-ice-rinks hub.
// Renders nothing if city is unknown OR counts.rinks < 3.
import Link from 'next/link';
import type { NewsCity } from '@/lib/news-related';

interface Props {
  cityData: NewsCity | null;
}

const MIN_RINKS = 3; // per Phase 7 spec §9.3

export default function NewsCityCTA({ cityData }: Props) {
  if (!cityData) return null;
  if (cityData.counts.rinks < MIN_RINKS) return null;

  const { city, country, counts } = cityData;
  const citySlug = slugifyCity(city);

  return (
    <section
      aria-label={`Hockey in ${city}`}
      style={{
        background: '#041E42',
        color: '#fff',
        padding: '2rem 1rem',
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.25rem',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: '#FFB81C',
              marginBottom: '0.4rem',
            }}
          >
            {country ? `${country}` : 'Hockey Directory'}
          </div>
          <h2
            style={{
              fontFamily: '"Bebas Neue", Impact, sans-serif',
              fontSize: '1.75rem',
              letterSpacing: '0.04em',
              margin: 0,
              marginBottom: '0.4rem',
            }}
          >
            Hockey in {city}
          </h2>
          <div
            style={{
              fontSize: '0.9rem',
              color: 'rgba(255,255,255,0.85)',
            }}
          >
            {counts.rinks} rinks · {counts.teams} teams
            {counts.leagues > 0 ? ` · ${counts.leagues} leagues` : ''}
          </div>
        </div>

        <Link
          href={`/best-ice-rinks/${citySlug}`}
          style={{
            display: 'inline-block',
            background: '#FFB81C',
            color: '#041E42',
            padding: '0.75rem 1.5rem',
            borderRadius: '4px',
            textDecoration: 'none',
            fontWeight: 700,
            fontSize: '0.95rem',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            transition: 'background 0.18s, transform 0.18s',
          }}
        >
          Explore {city} →
        </Link>
      </div>
    </section>
  );
}

/** Lowercase, hyphenate, strip diacritics. Best-effort slug for /best-ice-rinks/[city]. */
function slugifyCity(city: string): string {
  return city
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
