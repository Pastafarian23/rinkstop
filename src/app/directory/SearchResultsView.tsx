'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { SearchResultsResponse, ResultItem } from '../api/search/results/route';

type ResultType = 'rink' | 'team' | 'player' | 'league' | 'brand';

const TYPE_META: Record<ResultType, { label: string; emoji: string; singular: string }> = {
  rink: { label: 'Rinks', emoji: '🏟️', singular: 'rink' },
  team: { label: 'Teams', emoji: '🏒', singular: 'team' },
  player: { label: 'Players', emoji: '⭐', singular: 'player' },
  league: { label: 'Leagues', emoji: '🏆', singular: 'league' },
  brand: { label: 'Brands', emoji: '🛍️', singular: 'brand' },
};

/**
 * /directory?q=... results view.
 *
 * Renders grouped search results (Rinks, Teams, Players, Leagues, Brands)
 * with per-type counts and a "no results" empty state. Used by
 * DirectoryLandingClient when ?q is present in the URL.
 *
 * Server-comparable design: each row is a real Link to the entity, so
 * search engines can crawl the results. We also expose results in the
 * page metadata (handled by the parent page.tsx) so Google indexes them.
 */
export function SearchResultsView({ q }: { q: string }) {
  const [data, setData] = useState<SearchResultsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/search/results?q=${encodeURIComponent(q)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Search failed: ${r.status}`);
        return r.json() as Promise<SearchResultsResponse>;
      })
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Search failed');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [q]);

  if (q.length < 2) {
    return <p style={{ color: 'rgba(255,255,255,0.5)' }}>Type at least 2 characters to search.</p>;
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }} aria-busy="true">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              height: 60,
              background: 'var(--s2)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
        ))}
        <style>{`@keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.5 } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          background: 'rgba(200,16,46,0.1)',
          border: '1px solid rgba(200,16,46,0.3)',
          borderRadius: 8,
          padding: '1.25rem 1.5rem',
          color: '#FF6B7A',
        }}
      >
        <strong>Search error.</strong> {error}
        <div style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>
          Try again or browse all{' '}
          <Link href="/directory/rinks" style={{ color: '#FFB81C' }}>rinks</Link>,{' '}
          <Link href="/directory/teams" style={{ color: '#FFB81C' }}>teams</Link>, or{' '}
          <Link href="/directory/players" style={{ color: '#FFB81C' }}>players</Link>.
        </div>
      </div>
    );
  }

  if (!data || data.totals.all === 0) {
    return <EmptyState q={q} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Results header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            fontSize: '0.875rem',
            color: 'rgba(255,255,255,0.6)',
          }}
        >
          Showing <strong style={{ color: '#fff' }}>{data.totals.all}</strong>{' '}
          result{data.totals.all === 1 ? '' : 's'} for{' '}
          <strong style={{ color: '#FFB81C' }}>&ldquo;{q}&rdquo;</strong>
        </div>
        <Link
          href="/directory"
          style={{
            fontSize: '0.8125rem',
            color: 'rgba(255,255,255,0.5)',
            textDecoration: 'none',
          }}
        >
          ← Browse all categories
        </Link>
      </div>

      {/* Grouped result lists */}
      {(Object.keys(TYPE_META) as ResultType[]).map((type) => {
        const items = data.results[type] ?? [];
        if (items.length === 0) return null;
        const meta = TYPE_META[type];
        return (
          <section key={type} aria-labelledby={`results-${type}`}>
            <h2
              id={`results-${type}`}
              style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                fontSize: '1.15rem',
                color: '#fff',
                letterSpacing: '0.05em',
                marginBottom: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span>{meta.emoji}</span>
              <span>{meta.label}</span>
              <span
                style={{
                  fontSize: '0.75rem',
                  color: 'rgba(255,255,255,0.4)',
                  fontWeight: 500,
                  letterSpacing: '0.06em',
                  marginLeft: '0.25rem',
                }}
              >
                {items.length}
                {items.length === 50 ? '+' : ''}
              </span>
            </h2>
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem',
              }}
            >
              {items.map((item) => (
                <ResultRow key={`${type}-${item.id}`} item={item} q={q} />
              ))}
            </ul>
          </section>
        );
      })}

      {/* Empty categories hint */}
      <EmptyCategoriesHint totals={data.totals} q={q} />
    </div>
  );
}

function ResultRow({ item, q }: { item: ResultItem; q: string }) {
  return (
    <li>
      <Link
        href={item.href}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.85rem',
          padding: '0.7rem 1rem',
          background: 'var(--s2)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          textDecoration: 'none',
          transition: 'border-color 0.15s, transform 0.15s',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = '#FFB81C';
          (e.currentTarget as HTMLElement).style.transform = 'translateX(2px)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = '';
          (e.currentTarget as HTMLElement).style.transform = '';
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              color: '#fff',
              fontSize: '0.95rem',
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            <Highlight text={item.name} q={q} />
          </div>
          {item.meta ? (
            <div
              style={{
                color: 'rgba(255,255,255,0.5)',
                fontSize: '0.8125rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {item.meta}
            </div>
          ) : null}
        </div>
        <span
          aria-hidden="true"
          style={{
            color: 'rgba(255,255,255,0.3)',
            fontSize: '1rem',
            flexShrink: 0,
          }}
        >
          →
        </span>
      </Link>
    </li>
  );
}

function EmptyState({ q }: { q: string }) {
  return (
    <div
      style={{
        background: 'var(--s2)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '2.5rem 2rem',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }} aria-hidden="true">
        🔍
      </div>
      <h2
        style={{
          fontFamily: "'Bebas Neue', Impact, sans-serif",
          fontSize: '1.5rem',
          color: '#fff',
          letterSpacing: '0.04em',
          marginBottom: '0.5rem',
        }}
      >
        NO RESULTS FOR &ldquo;{q}&rdquo;
      </h2>
      <p
        style={{
          color: 'rgba(255,255,255,0.55)',
          fontSize: '0.9375rem',
          lineHeight: 1.6,
          margin: '0 auto 1.5rem',
          maxWidth: 440,
        }}
      >
        We didn&rsquo;t find any rinks, teams, players, leagues, or brands matching that query.
        Not listed yet? You can add it for free.
      </p>
      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}
      >
        <Link
          href="/add-listing"
          style={{
            display: 'inline-block',
            background: '#FFB81C',
            color: '#0a0a0a',
            padding: '0.75rem 1.5rem',
            borderRadius: 6,
            fontWeight: 700,
            fontSize: '0.95rem',
            textDecoration: 'none',
            letterSpacing: '0.02em',
          }}
        >
          + Add a listing
        </Link>
        <Link
          href="/claim-your-listing"
          style={{
            display: 'inline-block',
            background: 'transparent',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.25)',
            padding: '0.75rem 1.5rem',
            borderRadius: 6,
            fontWeight: 600,
            fontSize: '0.9rem',
            textDecoration: 'none',
          }}
        >
          Claim an existing listing
        </Link>
      </div>
      <div
        style={{
          marginTop: '1.5rem',
          fontSize: '0.8125rem',
          color: 'rgba(255,255,255,0.4)',
        }}
      >
        Or browse all{' '}
        <Link href="/directory/rinks" style={{ color: '#FFB81C' }}>rinks</Link>
        {', '}
        <Link href="/directory/teams" style={{ color: '#FFB81C' }}>teams</Link>
        {', '}
        <Link href="/directory/players" style={{ color: '#FFB81C' }}>players</Link>
        {', or '}
        <Link href="/directory/leagues" style={{ color: '#FFB81C' }}>leagues</Link>.
      </div>
    </div>
  );
}

/**
 * If the user got results for some types but not others, point them at
 * the categories that returned nothing so they can browse those.
 */
function EmptyCategoriesHint({
  totals,
  q: _q,
}: {
  totals: SearchResultsResponse['totals'];
  q: string;
}) {
  const emptyTypes = (Object.keys(TYPE_META) as ResultType[]).filter((t) => totals[t] === 0);
  if (emptyTypes.length === 0) return null;

  return (
    <div
      style={{
        background: 'var(--s2)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '1rem 1.25rem',
        fontSize: '0.875rem',
        color: 'rgba(255,255,255,0.55)',
      }}
    >
      <strong style={{ color: 'rgba(255,255,255,0.7)' }}>No matches in:</strong>{' '}
      {emptyTypes.map((type, idx) => {
        const href =
          type === 'rink' ? '/directory/rinks' :
          type === 'team' ? '/directory/teams' :
          type === 'player' ? '/directory/players' :
          type === 'league' ? '/directory/leagues' :
          '/directory/brands';
        return (
          <span key={type}>
            <Link href={href} style={{ color: '#FFB81C' }}>
              {TYPE_META[type].label.toLowerCase()}
            </Link>
            {idx < emptyTypes.length - 1 ? ', ' : '.'}
          </span>
        );
      })}
    </div>
  );
}

function Highlight({ text, q }: { text: string; q: string }) {
  const term = q.trim();
  if (!term) return <>{text}</>;
  const lower = text.toLowerCase();
  const idx = lower.indexOf(term.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark
        style={{
          background: 'rgba(255,184,28,0.25)',
          color: '#FFB81C',
          padding: 0,
          fontWeight: 700,
        }}
      >
        {text.slice(idx, idx + term.length)}
      </mark>
      {text.slice(idx + term.length)}
    </>
  );
}