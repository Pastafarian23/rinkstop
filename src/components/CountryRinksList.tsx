'use client';
import { useState } from 'react';
import Link from 'next/link';

interface Rink {
  id: string;
  name: string;
  slug?: string;
  city?: string;
  address?: string;
  phone?: string;
  website_url?: string;
}

interface Props {
  rinks: Rink[];
  countryName: string;
  countrySlug: string;
  totalCount: number; // The full count (rinkCount from server), even if `rinks` is truncated
  card: string;
  border: string;
  red: string;
  textMain: string;
  textMuted: string;
  textDim: string;
}

const PAGE_STEPS = [10, 30, 60];

export default function CountryRinksList({
  rinks,
  countryName,
  countrySlug,
  totalCount,
  card,
  border,
  red,
  textMain,
  textMuted,
  textDim,
}: Props) {
  // If we have fewer rinks on the server than the first step, just show them all.
  const [showN, setShowN] = useState<number>(
    rinks.length <= PAGE_STEPS[0] ? rinks.length : PAGE_STEPS[0]
  );

  const visible = rinks.slice(0, showN);
  const remainingLoaded = rinks.length - showN;
  const remainingTotal = totalCount - rinks.length;
  const hasMoreLoaded = remainingLoaded > 0;
  const hasMoreTotal = remainingTotal > 0;

  return (
    <section style={{ marginBottom: 48 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16, borderLeft: `4px solid ${red}`, paddingLeft: 14 }}>
        <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 26, letterSpacing: '0.04em', color: textMain, margin: 0 }}>
          Ice Rinks in {countryName}
        </h2>
        <Link
          href={`/directory/rinks?country=${encodeURIComponent(countryName)}`}
          style={{ fontSize: 12, color: red, textDecoration: 'none', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}
        >
          Browse all {totalCount} →
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {visible.map(rink => (
          <article key={rink.id} style={{ background: card, border: `1px solid ${border}`, borderRadius: 10, padding: 18, position: 'relative' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: textMain, marginBottom: 4 }}>
              <Link
                href={`/directory/rinks/${rink.slug || rink.id}?from=${encodeURIComponent(countrySlug)}`}
                style={{ color: textMain, textDecoration: 'none', position: 'static' }}
              >
                <span style={{ position: 'absolute', inset: 0, zIndex: 0 }} aria-hidden="true" />
                <span style={{ position: 'relative', zIndex: 1 }}>{rink.name}</span>
              </Link>
            </h3>
            <div style={{ position: 'relative', zIndex: 1 }}>
              {rink.city && (
                <div style={{ fontSize: 13, color: textMuted, marginBottom: 8 }}>
                  {rink.city}{rink.address ? `, ${countryName}` : ''}
                </div>
              )}
              {rink.address && <div style={{ fontSize: 12, color: textDim, marginBottom: 4 }}>📍 {rink.address}</div>}
              {rink.phone && <div style={{ fontSize: 12, color: textDim, marginBottom: 4 }}>📞 {rink.phone}</div>}
              {rink.website_url && (
                <a
                  href={rink.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 12, color: red, textDecoration: 'none', position: 'relative', zIndex: 2 }}
                >
                  🌐 Visit website →
                </a>
              )}
            </div>
          </article>
        ))}
      </div>

      {(hasMoreLoaded || hasMoreTotal) && (
        <div style={{ marginTop: 18, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
          {PAGE_STEPS.map(step => {
            if (step <= showN) return null;
            if (step > rinks.length && !hasMoreTotal) return null;
            return (
              <button
                key={step}
                onClick={() => setShowN(step)}
                style={{
                  background: 'transparent',
                  border: `1.5px solid ${border}`,
                  color: textMuted,
                  borderRadius: 4,
                  padding: '8px 16px',
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                Show {Math.min(step, rinks.length)} of {totalCount}
              </button>
            );
          })}
          {hasMoreLoaded && (
            <button
              onClick={() => setShowN(rinks.length)}
              style={{
                background: red,
                border: 'none',
                color: '#fff',
                borderRadius: 4,
                padding: '8px 16px',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              Show all {totalCount} rinks →
            </button>
          )}
          {hasMoreTotal && (
            <Link
              href={`/directory/rinks?country=${encodeURIComponent(countryName)}`}
              style={{
                background: 'transparent',
                border: `1.5px solid ${red}`,
                color: red,
                borderRadius: 4,
                padding: '8px 16px',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              See all on directory →
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
