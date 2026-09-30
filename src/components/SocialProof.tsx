import { getDirectoryCounts } from '@/lib/directory-counts';

/**
 * <SocialProof /> — Live directory-count band for product pages.
 *
 * Shows the actual numbers (1,857 rinks, 78 countries, etc.) pulled from
 * Supabase on each render. Numbers that move up over time signal
 * "growing platform" without needing Arnel to update copy.
 *
 * Used on:
 *   - /pricing (in the hero)
 *   - /dataset-license (in the hero)
 *   - /learn/best-hockey-gear (in the footer)
 *
 * Why this matters:
 *   Visitors land on product pages and ask "is this legit?" before they
 *   pay. Live counts answer: "Yes — 1,857 rinks, 6,351 players, 78
 *   countries covered." Social proof reduces hesitation.
 *
 * Cost: 0 (no DB cost — wrapped in a 1-hour cache by getDirectoryCountsCached).
 */
export default async function SocialProof({ variant = 'default' }: { variant?: 'default' | 'compact' }) {
  const counts = await getDirectoryCounts();
  const stats = [
    { n: counts.rinks.toLocaleString(), l: 'ice rinks' },
    { n: counts.teams.toLocaleString(), l: 'teams' },
    { n: counts.players.toLocaleString(), l: 'players' },
    { n: counts.leagues.toLocaleString(), l: 'leagues' },
    { n: counts.cities.toLocaleString(), l: 'cities' },
    { n: counts.countries.toLocaleString(), l: 'countries' },
  ];

  if (variant === 'compact') {
    return (
      <div
        data-social-proof="compact"
        aria-label="RinkStop coverage"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '1.5rem 2.5rem',
          padding: '1.25rem 1rem',
          marginTop: '1.5rem',
          marginBottom: '1.5rem',
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 10,
        }}
      >
        {stats.map((s) => (
          <div key={s.l} style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span
              style={{
                fontFamily: 'Bebas Neue, Impact, sans-serif',
                fontSize: '1.25rem',
                fontWeight: 700,
                color: '#FFB81C',
                letterSpacing: '0.02em',
              }}
            >
              {s.n}
            </span>
            <span
              style={{
                fontSize: '0.8125rem',
                color: 'rgba(255,255,255,0.65)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontWeight: 600,
              }}
            >
              {s.l}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <section
      data-social-proof="default"
      aria-label="RinkStop coverage worldwide"
      style={{
        marginTop: '2rem',
        marginBottom: '2rem',
        padding: '2rem 1rem',
        background: 'linear-gradient(135deg, rgba(255,184,28,0.04) 0%, rgba(11,30,63,0.3) 100%)',
        border: '1px solid rgba(255,184,28,0.15)',
        borderRadius: 12,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: '0.6875rem',
          fontWeight: 800,
          letterSpacing: '0.22em',
          color: 'rgba(255,184,28,0.7)',
          textTransform: 'uppercase',
          marginBottom: '1rem',
        }}
      >
        RinkStop coverage, today
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '1rem',
        }}
      >
        {stats.map((s) => (
          <div key={s.l}>
            <div
              style={{
                fontFamily: 'Bebas Neue, Impact, sans-serif',
                fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
                fontWeight: 700,
                color: '#FFB81C',
                letterSpacing: '0.02em',
                lineHeight: 1,
              }}
            >
              {s.n}
            </div>
            <div
              style={{
                fontSize: '0.75rem',
                color: 'rgba(255,255,255,0.55)',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                fontWeight: 600,
                marginTop: '0.4rem',
              }}
            >
              {s.l}
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: '1rem',
          fontSize: '0.75rem',
          color: 'rgba(255,255,255,0.4)',
        }}
      >
        Updated continuously from our directory.
      </div>
    </section>
  );
}