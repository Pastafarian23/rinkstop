import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  NHL_FRANCHISE_HISTORY,
  getChainForSlug,
  type FranchiseChain,
  type FranchiseEntry,
} from '@/lib/nhl-franchise-history';

export const dynamicParams = false;

export function generateStaticParams() {
  // Pre-render one page per historical (non-current) entry across all chains.
  return NHL_FRANCHISE_HISTORY.flatMap((chain) =>
    chain.chain.filter((e) => e.slug !== chain.current).map((e) => ({ slug: e.slug }))
  );
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = findEntry(slug);
  if (!result) return { title: 'Not Found' };
  const { entry, chain } = result;
  return {
    title: `${entry.name} (${entry.years}) — Now the ${chain.currentName} | RinkStop`,
    description: `The ${entry.name} played in ${entry.city} from ${entry.years}. Today this franchise is the ${chain.currentName}.${entry.notes ? ' ' + entry.notes : ''}`,
  };
}

function findEntry(slug: string): { entry: FranchiseEntry; chain: FranchiseChain; index: number } | null {
  for (const chain of NHL_FRANCHISE_HISTORY) {
    const idx = chain.chain.findIndex((e) => e.slug === slug);
    if (idx >= 0) return { entry: chain.chain[idx], chain, index: idx };
  }
  return null;
}

export default async function HistoricalTeamPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = findEntry(slug);
  if (!result) notFound();
  const { entry, chain, index } = result;
  const isCurrent = index === chain.chain.length - 1;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--s1)', color: '#fff' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '4rem 1.5rem' }}>
        <Link
          href="/directory/nhl/history"
          style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textDecoration: 'none', letterSpacing: '0.05em' }}
        >
          ← BACK TO NHL FRANCHISE HISTORY
        </Link>

        <div
          style={{
            fontSize: '0.625rem',
            fontWeight: 700,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: isCurrent ? 'var(--red)' : 'rgba(255,255,255,0.4)',
            marginTop: '1.5rem',
            marginBottom: '0.5rem',
          }}
        >
          {isCurrent ? 'Current NHL Franchise' : 'Former NHL Franchise'}
        </div>

        <h1
          style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: 'clamp(2.25rem, 6vw, 3.5rem)',
            letterSpacing: '0.02em',
            margin: 0,
            lineHeight: 1,
            color: '#fff',
          }}
        >
          {entry.name.toUpperCase()}
        </h1>

        <div
          style={{
            display: 'flex',
            gap: '1.5rem',
            marginTop: '0.75rem',
            fontSize: '0.875rem',
            color: 'rgba(255,255,255,0.6)',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{entry.years}</span>
          <span>{entry.city}</span>
        </div>

        {entry.notes ? (
          <p style={{ fontSize: '0.9375rem', color: 'rgba(255,255,255,0.7)', marginTop: '1.5rem', lineHeight: 1.6 }}>
            {entry.notes}
          </p>
        ) : null}

        {/* "What this team became" callout */}
        {!isCurrent ? (
          <div
            style={{
              background: 'rgba(200,16,46,0.08)',
              border: '1px solid rgba(200,16,46,0.3)',
              borderRadius: '8px',
              padding: '1.25rem 1.5rem',
              marginTop: '2rem',
            }}
          >
            <div
              style={{
                fontSize: '0.625rem',
                fontWeight: 700,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: 'var(--red)',
                marginBottom: '0.5rem',
              }}
            >
              What this team became
            </div>
            <p style={{ fontSize: '0.9375rem', color: '#fff', margin: 0, lineHeight: 1.5 }}>
              Today this franchise is the{' '}
              <Link
                href={`/directory/teams/${chain.current}`}
                style={{ color: 'var(--red)', fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: '3px' }}
              >
                {chain.currentName}
              </Link>
              . The {entry.name}'s full history — including all wins, losses, and records — carries forward to the
              current franchise.
            </p>
          </div>
        ) : (
          <div
            style={{
              background: 'var(--s2)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '1.25rem 1.5rem',
              marginTop: '2rem',
            }}
          >
            <p style={{ fontSize: '0.9375rem', color: 'rgba(255,255,255,0.75)', margin: 0, lineHeight: 1.5 }}>
              This is the current incarnation of the franchise. See the full lineage below.
            </p>
          </div>
        )}

        {/* Full chain context */}
        <section style={{ marginTop: '3rem' }}>
          <h2
            style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              fontSize: '1.125rem',
              letterSpacing: '0.04em',
              color: '#fff',
              marginBottom: '0.5rem',
            }}
          >
            FRANCHISE LINEAGE
          </h2>
          <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.55)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            {chain.blurb}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {chain.chain.map((e, i) => {
              const entryIsCurrent = i === chain.chain.length - 1;
              const isThisEntry = e.slug === entry.slug;
              return (
                <div
                  key={e.slug}
                  style={{
                    background: isThisEntry ? 'rgba(200,16,46,0.08)' : 'var(--s2)',
                    border: isThisEntry ? '1px solid rgba(200,16,46,0.3)' : '1px solid var(--border)',
                    borderRadius: '6px',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <span style={{ fontSize: '0.9375rem', fontWeight: isThisEntry || entryIsCurrent ? 800 : 600, color: isThisEntry ? 'var(--red)' : '#fff' }}>
                    {e.name}
                    {entryIsCurrent && !isThisEntry && (
                      <span
                        style={{
                          marginLeft: '0.5rem',
                          fontSize: '0.5625rem',
                          fontWeight: 700,
                          letterSpacing: '0.1em',
                          color: 'rgba(255,255,255,0.4)',
                          textTransform: 'uppercase',
                        }}
                      >
                        CURRENT
                      </span>
                    )}
                  </span>
                  <span style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)', fontVariantNumeric: 'tabular-nums' }}>
                    {e.years} · {e.city}
                  </span>
                </div>
              );
            })}
          </div>

          <Link
            href="/directory/nhl/history"
            style={{
              display: 'inline-block',
              marginTop: '1.5rem',
              fontSize: '0.75rem',
              color: 'var(--red)',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            ← View all NHL franchise chains
          </Link>
        </section>
      </div>
    </div>
  );
}
