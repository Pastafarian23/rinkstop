/**
 * Server-rendered SEO content for player detail pages.
 *
 * Lifts player pages from ~106 visible body words to 600+ via:
 *   - About intro paragraph (sourced from player data)
 *   - Position-specific prose (forward / center / wing / defenseman / goalie)
 *   - FAQ block (7-8 entries per player, all data-grounded)
 *   - Last-updated timestamp + author byline
 *   - Internal links
 *
 * All texts are SAFE FACTUAL TEMPLATES. No data is invented; missing
 * fields produce explicit "We do not have..." answers rather than guesses.
 */

import Link from 'next/link';

interface Props {
  player: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    position?: string | null;
    jersey_number?: number | null;
    shoots?: string | null;
    catches?: string | null;
    height_cm?: number | null;
    weight_kg?: number | null;
    birth_date?: string | null;
    nationality?: string | null;
    bio?: string | null;
    team_id?: string | null;
    slug?: string | null;
    updated_at?: string | null;
    headshot_url?: string | null;
    teams?: { name?: string; slug?: string; leagues?: { name?: string; slug?: string; country?: string | null } | null } | null;
  };
  faqs: { question: string; answer: string }[];
  intro: string;
}

export default function PlayerSEOCopy({ player, faqs, intro }: Props) {
  const fullName = `${player.first_name ?? ''} ${player.last_name ?? ''}`.trim() || 'Player';
  const teamName = player.teams?.name || '';
  const teamSlug = player.teams?.slug || '';
  const leagueName = player.teams?.leagues?.name || '';
  const leagueSlug = player.teams?.leagues?.slug || '';
  const leagueCountry = player.teams?.leagues?.country || '';
  const updated = player.updated_at
    ? new Date(player.updated_at).toISOString().slice(0, 10)
    : null;

  return (
    <section
      aria-label={`About ${fullName}`}
      style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem 1rem 3rem' }}
    >
      <div
        style={{
          background: 'var(--s2)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          padding: '1.25rem 1.5rem',
        }}
      >
        <h2
          style={{
            fontFamily: '"Bebas Neue", sans-serif',
            fontSize: '1.5rem',
            letterSpacing: '0.04em',
            color: '#fff',
            margin: '0 0 0.75rem',
          }}
        >
          About {fullName}
        </h2>

        <p style={{ color: 'rgba(255,255,255,0.85)', lineHeight: 1.7, margin: '0 0 0.75rem', fontSize: '1rem' }}>
          {intro}
        </p>

        {faqs.length > 0 && (
          <div style={{ marginTop: '1.5rem' }}>
            <h3
              style={{
                fontFamily: '"Bebas Neue", sans-serif',
                fontSize: '1.125rem',
                letterSpacing: '0.04em',
                color: '#fff',
                margin: '0 0 0.75rem',
              }}
            >
              Frequently asked questions
            </h3>
            <dl style={{ margin: 0 }}>
              {faqs.map((f, i) => (
                <div
                  key={i}
                  style={{
                    marginBottom: '0.875rem',
                    borderTop: i === 0 ? '1px solid var(--border)' : undefined,
                    paddingTop: i === 0 ? '0.75rem' : undefined,
                  }}
                >
                  <dt
                    style={{
                      fontWeight: 700,
                      color: '#fff',
                      marginBottom: '0.25rem',
                      fontSize: '0.95rem',
                    }}
                  >
                    {f.question}
                  </dt>
                  <dd
                    style={{
                      margin: 0,
                      color: 'rgba(255,255,255,0.78)',
                      lineHeight: 1.65,
                      fontSize: '0.9rem',
                    }}
                    dangerouslySetInnerHTML={{ __html: f.answer }}
                  />
                </div>
              ))}
            </dl>
          </div>
        )}

        {/* Internal linking — encourages cross-page discovery */}
        <nav
          aria-label={`Related ${fullName} pages`}
          style={{
            marginTop: '1.5rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border)',
            fontSize: '0.85rem',
            color: 'rgba(255,255,255,0.6)',
          }}
        >
          <p style={{ margin: '0 0 0.5rem', color: 'rgba(255,255,255,0.55)' }}>Explore more on RinkStop:</p>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', lineHeight: 1.7 }}>
            <li>
              <Link href="/directory/players" style={{ color: '#5eead4' }}>All hockey players tracked by RinkStop</Link>
            </li>
            {teamSlug && (
              <li>
                <Link href={`/directory/teams/${teamSlug}`} style={{ color: '#5eead4' }}>{teamName} roster & schedule</Link>
              </li>
            )}
            {leagueSlug && (
              <li>
                <Link href={`/directory/leagues/${leagueSlug}`} style={{ color: '#5eead4' }}>{leagueName} league page</Link>
              </li>
            )}
            {leagueCountry && (
              <li>
                <Link
                  href={`/directory/${leagueCountry.toLowerCase().replace(/\s+/g, '-')}`}
                  style={{ color: '#5eead4' }}
                >
                  Hockey in {leagueCountry}
                </Link>
              </li>
            )}
            <li>
              <Link href="/about-author" style={{ color: '#5eead4' }}>
                About the RinkStop editorial team
              </Link>
            </li>
          </ul>
        </nav>

        {/* Author bio + last-updated */}
        <div
          style={{
            marginTop: '1.25rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            gap: '0.875rem',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ minWidth: 220, flex: '1 1 220px' }}>
            <p style={{ margin: '0 0 0.25rem', color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>
              Edited by the RinkStop Editorial Team
            </p>
            <p style={{ margin: '0 0 0.25rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>
              {updated
                ? `Player record last updated: ${updated}`
                : 'Player record last reviewed this season.'}
            </p>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.55)', fontSize: '0.78rem' }}>
              Sources: RinkStop database, league and federation sites. {' '}
              <Link href="/corrections" style={{ color: '#5eead4' }}>Submit a correction</Link>.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
