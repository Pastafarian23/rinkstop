/**
 * LocationHeader — Phase 7 (Option B) article→directory link equity.
 *
 * Renders a small "Hockey in [Location]" breadcrumb above the article body,
 * linking each non-null slug to its directory page. Renders nothing if all
 * three slug fields are null.
 *
 * URL pattern matches the existing directory structure:
 *   /directory/{country_slug}
 *   /directory/{country_slug}/{state_slug}
 *   /directory/{country_slug}/{state_slug}/{city_slug}
 *
 * Posts with only a city but no state are valid for some countries (e.g.
 * UK, Germany). Posts with only a country are valid for country-wide
 * topics. All three slug fields are nullable independently.
 */

import Link from 'next/link';

interface LocationHeaderProps {
  country_slug?: string | null;
  state_slug?: string | null;
  city_slug?: string | null;
  country_label?: string | null;
  state_label?: string | null;
  city_label?: string | null;
}

function formatLabel(slug: string | null | undefined, fallback?: string | null): string {
  if (fallback) return fallback;
  if (!slug) return '';
  return slug
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function LocationHeader({
  country_slug,
  state_slug,
  city_slug,
  country_label,
  state_label,
  city_label,
}: LocationHeaderProps) {
  if (!country_slug && !state_slug && !city_slug) return null;

  const segments: { label: string; href: string }[] = [];

  if (country_slug) {
    segments.push({
      label: formatLabel(country_slug, country_label),
      href: `/directory/${country_slug}`,
    });
  }
  if (state_slug && country_slug) {
    segments.push({
      label: formatLabel(state_slug, state_label),
      href: `/directory/${country_slug}/${state_slug}`,
    });
  }
  if (city_slug && country_slug) {
    const href = state_slug
      ? `/directory/${country_slug}/${state_slug}/${city_slug}`
      : `/directory/${country_slug}/${city_slug}`;
    segments.push({
      label: formatLabel(city_slug, city_label),
      href,
    });
  }

  if (segments.length === 0) return null;

  return (
    <nav
      aria-label="Article location"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        flexWrap: 'wrap',
        marginBottom: '0.75rem',
        padding: '0.35rem 0.6rem 0.35rem 0.7rem',
        background: 'rgba(20,184,166,0.12)',
        border: '1px solid rgba(20,184,166,0.35)',
        borderRadius: 999,
        fontSize: '0.7rem',
      }}
    >
      <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        📍 Hockey in
      </span>
      {segments.map((seg, i) => (
        <span key={seg.href} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <Link
            href={seg.href}
            style={{
              color: '#14B8A6',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            {seg.label}
          </Link>
          {i < segments.length - 1 && <span style={{ color: 'rgba(255,255,255,0.4)' }}>›</span>}
        </span>
      ))}
    </nav>
  );
}