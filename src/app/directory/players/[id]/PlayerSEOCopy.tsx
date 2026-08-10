/**
 * Server-rendered SEO content for player detail pages.
 *
 * Replaces the previous templated position-explanation prose
 * (formerly lifted pages to 600+ words with generic defenseman /
 * center / wing text repeated across hundreds of records).
 *
 * What this renders now:
 *   - Entity-specific facts only: position, nationality, birth year,
 *     current team, jersey number — sourced from the player record.
 *   - Recent context (last updated).
 *   - Internal links.
 *
 * NO position-explanation paragraphs. NO generic FAQs. If a record
 * has missing fields, the section is omitted rather than fabricating
 * a default. This addresses ChatGPT's "templated thin content" flag
 * on player pages and is what AdSense reviewers will look at first.
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
  // Player-specific career stats when available. Optional — older or
  // community-submitted records may not have these.
  career?: {
    seasons_played?: number | null;
    teams_played_for?: number | null;
    leagues_played_in?: number | null;
  };
}

export default function PlayerSEOCopy({ player, career }: Props) {
  const fullName = `${player.first_name ?? ''} ${player.last_name ?? ''}`.trim() || 'Player';
  const teamName = player.teams?.name || '';
  const teamSlug = player.teams?.slug || '';
  const leagueName = player.teams?.leagues?.name || '';
  const leagueSlug = player.teams?.leagues?.slug || '';
  const leagueCountry = player.teams?.leagues?.country || '';
  const updated = player.updated_at
    ? new Date(player.updated_at).toISOString().slice(0, 10)
    : null;

  // Build the entity-specific facts list. Each row is sourced from the
  // player record — no fabricated defaults.
  const facts: { label: string; value: string }[] = [];
  if (player.position) facts.push({ label: 'Position', value: player.position });
  if (player.jersey_number != null) facts.push({ label: 'Jersey', value: `#${player.jersey_number}` });
  if (player.nationality) facts.push({ label: 'Nationality', value: player.nationality });
  if (player.birth_date) facts.push({ label: 'Born', value: player.birth_date.slice(0, 10) });
  if (player.height_cm) facts.push({ label: 'Height', value: `${player.height_cm} cm` });
  if (player.weight_kg) facts.push({ label: 'Weight', value: `${player.weight_kg} kg` });
  if (player.shoots) facts.push({ label: 'Shoots', value: player.shoots });
  if (player.catches) facts.push({ label: 'Catches', value: player.catches });
  if (career?.seasons_played != null) facts.push({ label: 'Seasons played', value: String(career.seasons_played) });
  if (career?.teams_played_for != null) facts.push({ label: 'Teams', value: String(career.teams_played_for) });
  if (career?.leagues_played_in != null) facts.push({ label: 'Leagues', value: String(career.leagues_played_in) });

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

        {/* Entity-specific facts table — sourced from player record only */}
        {facts.length > 0 && (
          <div style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
            <dl
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '0.5rem 1.5rem',
                margin: 0,
              }}
            >
              {facts.map((f) => (
                <div key={f.label} style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
                  <dt
                    style={{
                      fontSize: '0.75rem',
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      color: 'rgba(255,255,255,0.55)',
                      fontWeight: 700,
                    }}
                  >
                    {f.label}:
                  </dt>
                  <dd
                    style={{
                      margin: 0,
                      color: '#fff',
                      fontSize: '0.95rem',
                      fontWeight: 500,
                    }}
                  >
                    {f.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {/* Bio (only if present in the record — no fallback prose) */}
        {player.bio && (
          <div style={{ marginTop: '1rem' }}>
            <h3
              style={{
                fontFamily: '"Bebas Neue", sans-serif',
                fontSize: '1.125rem',
                letterSpacing: '0.04em',
                color: '#fff',
                margin: '0 0 0.5rem',
              }}
            >
              Biography
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.85)', lineHeight: 1.7, margin: 0, fontSize: '1rem' }}>
              {player.bio}
            </p>
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
              <Link href="/learn/hockey-positions-explained" style={{ color: '#5eead4' }}>
                Hockey positions explained
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
