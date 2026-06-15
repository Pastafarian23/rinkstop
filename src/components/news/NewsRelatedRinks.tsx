// src/components/news/NewsRelatedRinks.tsx
// Server component — Block B. Renders a 2–3 up grid of related rinks
// below the article body. Renders nothing if no rinks are found.
import Link from 'next/link';
import type { NewsRink } from '@/lib/news-related';

interface Props {
  rinks: NewsRink[];
  cityLabel?: string;
}

export default function NewsRelatedRinks({ rinks, cityLabel }: Props) {
  if (rinks.length === 0) return null;

  return (
    <section
      aria-label="Related rinks"
      style={{
        background: '#f7f9fc',
        borderTop: '1px solid rgba(0,0,0,0.06)',
        padding: '2.5rem 1rem',
      }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            marginBottom: '1.25rem',
          }}
        >
          <h2
            style={{
              fontFamily: '"Bebas Neue", Impact, sans-serif',
              fontSize: '1.6rem',
              color: '#041E42',
              letterSpacing: '0.04em',
              margin: 0,
            }}
          >
            {cityLabel ? `Rinks in ${cityLabel}` : 'Related Rinks'}
          </h2>
          <Link
            href="/directory/rinks"
            style={{
              color: '#C8102E',
              fontSize: '0.8125rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              textDecoration: 'none',
            }}
          >
            See all rinks →
          </Link>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '1rem',
          }}
        >
          {rinks.map((rink) => (
            <Link
              key={rink.id}
              href={`/directory/rinks/${rink.slug}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                background: '#fff',
                border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: '6px',
                overflow: 'hidden',
                textDecoration: 'none',
                transition: 'transform 0.18s, border-color 0.18s, box-shadow 0.18s',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '16 / 9',
                  background: '#e5ecf5',
                  overflow: 'hidden',
                }}
              >
                {rink.cover_photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={rink.cover_photo_url}
                    alt={rink.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '100%',
                      height: '100%',
                      fontSize: '2.5rem',
                      color: '#041E42',
                    }}
                    aria-hidden
                  >
                    🏒
                  </div>
                )}
              </div>
              <div style={{ padding: '0.85rem 1rem' }}>
                <div
                  style={{
                    fontWeight: 700,
                    color: '#041E42',
                    fontSize: '1rem',
                    marginBottom: '0.2rem',
                    lineHeight: 1.2,
                  }}
                >
                  {rink.name}
                </div>
                <div
                  style={{
                    color: '#666',
                    fontSize: '0.8125rem',
                  }}
                >
                  {[rink.city, rink.country].filter(Boolean).join(', ')}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
