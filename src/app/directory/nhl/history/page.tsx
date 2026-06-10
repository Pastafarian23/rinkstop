import Link from 'next/link';
import { NHL_FRANCHISE_HISTORY } from '@/lib/nhl-franchise-history';

export const metadata = {
  title: 'NHL Franchise History — Relocations, Renames, and Predecessors | RinkStop',
  description:
    'Complete lineage of every NHL franchise that has relocated or rebranded. Find what became of your favorite team — from Hartford Whalers to Carolina Hurricanes, Quebec Nordiques to Colorado Avalanche, and more.',
};

export default function NHLHistoryPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--s1)', color: '#fff' }}>
      <div style={{ maxWidth: '920px', margin: '0 auto', padding: '4rem 1.5rem' }}>
        <Link
          href="/directory/teams"
          style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textDecoration: 'none', letterSpacing: '0.05em' }}
        >
          ← BACK TO TEAMS DIRECTORY
        </Link>

        <h1
          style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: 'clamp(2rem, 5vw, 3rem)',
            letterSpacing: '0.02em',
            marginTop: '1rem',
            marginBottom: '0.5rem',
            lineHeight: 1.05,
          }}
        >
          NHL FRANCHISE HISTORY
        </h1>
        <p style={{ fontSize: '0.9375rem', color: 'rgba(255,255,255,0.6)', maxWidth: '640px', lineHeight: 1.55, marginBottom: '2.5rem' }}>
          Seven active NHL franchises are the direct successors of teams that have moved, renamed, or otherwise
          shifted identity. This page tracks every chain — from the original WHA days to today's Utah Hockey Club —
          so you can find what became of any team that no longer exists under its old name.
        </p>

        {NHL_FRANCHISE_HISTORY.map((chain) => (
          <section
            key={chain.current}
            id={chain.current}
            style={{
              background: 'var(--s2)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '1.5rem 1.75rem',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <h2
                style={{
                  fontFamily: "'Bebas Neue', Impact, sans-serif",
                  fontSize: '1.5rem',
                  color: 'var(--red)',
                  letterSpacing: '0.03em',
                  margin: 0,
                }}
              >
                {chain.currentName.toUpperCase()}
              </h2>
              <Link
                href={`/directory/teams/${chain.current}`}
                style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontWeight: 600 }}
              >
                Current team page →
              </Link>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              {chain.blurb}
            </p>

            <div style={{ position: 'relative' }}>
              {chain.chain.map((entry, i) => {
                const isCurrent = i === chain.chain.length - 1;
                const isLast = i === chain.chain.length - 1;
                return (
                  <div key={entry.slug} style={{ display: 'flex', gap: '1rem', position: 'relative' }}>
                    {/* Timeline rail + dot */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: '24px' }}>
                      <div
                        style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          background: isCurrent ? 'var(--red)' : 'rgba(255,255,255,0.25)',
                          border: isCurrent ? '3px solid rgba(200,16,46,0.3)' : 'none',
                          marginTop: '0.4rem',
                          boxShadow: isCurrent ? '0 0 0 4px rgba(200,16,46,0.1)' : 'none',
                        }}
                      />
                      {!isLast && (
                        <div
                          style={{
                            flex: 1,
                            width: '2px',
                            background: 'rgba(255,255,255,0.1)',
                            marginTop: '0.25rem',
                            minHeight: '2.5rem',
                          }}
                        />
                      )}
                    </div>

                    {/* Entry body */}
                    <div style={{ flex: 1, paddingBottom: isLast ? 0 : '1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {isCurrent ? (
                          <span style={{ fontSize: '1rem', fontWeight: 800, color: '#fff' }}>{entry.name}</span>
                        ) : (
                          <Link
                            href={`/directory/nhl/history/${entry.slug}`}
                            style={{
                              fontSize: '1rem',
                              fontWeight: 600,
                              color: 'rgba(255,255,255,0.9)',
                              textDecoration: 'none',
                              borderBottom: '1px dotted rgba(255,255,255,0.3)',
                            }}
                          >
                            {entry.name}
                          </Link>
                        )}
                        {isCurrent && (
                          <span
                            style={{
                              fontSize: '0.5625rem',
                              fontWeight: 700,
                              letterSpacing: '0.1em',
                              color: 'var(--red)',
                              textTransform: 'uppercase',
                              background: 'rgba(200,16,46,0.12)',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '3px',
                            }}
                          >
                            CURRENT
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.2rem' }}>
                        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{entry.years}</span> · {entry.city}
                        {entry.notes ? <span style={{ color: 'rgba(255,255,255,0.4)' }}> — {entry.notes}</span> : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        <div
          style={{
            background: 'var(--s2)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '1.25rem 1.5rem',
            marginTop: '2rem',
            fontSize: '0.8125rem',
            color: 'rgba(255,255,255,0.55)',
            lineHeight: 1.55,
          }}
        >
          <strong style={{ color: '#fff' }}>A note on history:</strong> NHL teams that have not relocated or
          renamed — even after significant identity changes (e.g. the 2025-26 Utah rebrand from "Hockey Club" to
          "Mammoth" identity) — are listed once with their full lineage shown on their current team page. This page
          covers the seven franchises that have physically moved cities or had an explicit name change transfer
          recognized by the league.
        </div>
      </div>
    </div>
  );
}
