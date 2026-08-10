/**
 * Server-rendered SEO content for player detail pages.
 *
 * Path B player page depth (Path B executed 2026-08-10):
 *   - Entity-specific facts table (position, jersey, nationality, etc.)
 *   - Career context: current team, league, country
 *   - Player connections: same-team peers, league context, nationality links
 *   - Source attribution + verification metadata + last-updated
 *
 * NO templated position-explanation prose. NO generic FAQs.
 * Renders only fields that exist in the players table schema:
 *   position, jersey_number, shoots, catches, height_cm, weight_kg,
 *   birth_date, nationality, bio, headshot_url, is_active, updated_at.
 *
 * Optional props (passed empty for now): `career` aggregates
 * (seasons_played, teams_played_for, leagues_played_in), `teammates`
 * (same-team peers pre-fetched from page.tsx), `leagueContext`
 * (league-level stats).
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
  career?: {
    seasons_played?: number | null;
    teams_played_for?: number | null;
    leagues_played_in?: number | null;
  };
  teammates?: { id: string; first_name?: string | null; last_name?: string | null; slug?: string | null; position?: string | null; jersey_number?: number | null }[];
  leagueContext?: { total_teams?: number | null; total_players?: number | null; country?: string | null; founded_year?: number | null };
}

export default function PlayerSEOCopy({ player, career, teammates, leagueContext }: Props) {
  const fullName = `${player.first_name ?? ''} ${player.last_name ?? ''}`.trim() || 'Player';
  const teamName = player.teams?.name || '';
  const teamSlug = player.teams?.slug || '';
  const leagueName = player.teams?.leagues?.name || '';
  const leagueSlug = player.teams?.leagues?.slug || '';
  const leagueCountry = player.teams?.leagues?.country || '';
  const updated = player.updated_at
    ? new Date(player.updated_at).toISOString().slice(0, 10)
    : null;

  // Compute birth year from birth_date for the career timeline block.
  const birthYear = player.birth_date ? Number(player.birth_date.slice(0, 4)) : null;

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

        {/* Bio — only if present in the record (no fallback prose) */}
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

        {/* Current context — sourced from player record, never fabricated */}
        {(teamName || leagueName || leagueCountry || birthYear) && (
          <div style={{ marginTop: '1.25rem' }}>
            <h3
              style={{
                fontFamily: '"Bebas Neue", sans-serif',
                fontSize: '1.125rem',
                letterSpacing: '0.04em',
                color: '#fff',
                margin: '0 0 0.5rem',
              }}
            >
              Current context
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.85)', lineHeight: 1.7, margin: 0, fontSize: '0.95rem' }}>
              {fullName} is recorded as{' '}
              {player.position ? <><strong>{player.position}</strong>{' '}</> : null}
              {teamName && teamSlug ? (
                <>
                  currently on{' '}
                  <Link href={`/directory/teams/${teamSlug}`} style={{ color: '#5eead4' }}>
                    {teamName}
                  </Link>
                  {' '}
                </>
              ) : teamName ? (
                <>currently on {teamName} </> 
              ) : null}
              {leagueName && leagueSlug ? (
                <>
                  of the{' '}
                  <Link href={`/directory/leagues/${leagueSlug}`} style={{ color: '#5eead4' }}>
                    {leagueName}
                  </Link>
                </>
              ) : null}
              {leagueCountry && (
                <>{teamName || leagueName ? ',' : ''} {leagueCountry}</>
              )}
              {birthYear && (
                <>. {fullName.split(' ')[0]} was born in {birthYear}</>
              )}
              . {player.nationality && (
                <> {player.nationality} nationality</>
              )}{' '}
              — see the team and league pages for full roster context, schedule, and standings.
            </p>
          </div>
        )}

        {/* League context — sourced from pre-fetched `leagueContext` prop */}
        {leagueContext && (leagueContext.total_teams != null || leagueContext.total_players != null || leagueContext.founded_year != null) && (
          <div style={{ marginTop: '1rem', padding: '0.875rem 1rem', background: 'rgba(255,255,255,0.04)', borderRadius: '6px' }}>
            <h4 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '0.875rem', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.65)', margin: '0 0 0.5rem', textTransform: 'uppercase' }}>
              {leagueName || 'League'} at a glance
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem 1.5rem', fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)' }}>
              {leagueContext.total_teams != null && <span><strong style={{ color: '#fff' }}>{leagueContext.total_teams}</strong> teams</span>}
              {leagueContext.total_players != null && <span><strong style={{ color: '#fff' }}>{leagueContext.total_players}</strong> players tracked</span>}
              {leagueContext.founded_year != null && <span>Founded <strong style={{ color: '#fff' }}>{leagueContext.founded_year}</strong></span>}
              {leagueContext.country && <span>Country <strong style={{ color: '#fff' }}>{leagueContext.country}</strong></span>}
            </div>
          </div>
        )}

        {/* Teammates — sourced from pre-fetched `teammates` prop, when present */}
        {teammates && teammates.length > 0 && (
          <div style={{ marginTop: '1.25rem' }}>
            <h3
              style={{
                fontFamily: '"Bebas Neue", sans-serif',
                fontSize: '1.125rem',
                letterSpacing: '0.04em',
                color: '#fff',
                margin: '0 0 0.5rem',
              }}
            >
              {teamName ? `${teamName} teammates` : 'Related players'}
            </h3>
            <ul style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1rem', margin: 0, padding: 0, listStyle: 'none' }}>
              {teammates.slice(0, 12).map((t) => {
                const name = `${t.first_name ?? ''} ${t.last_name ?? ''}`.trim();
                if (!name) return null;
                return (
                  <li key={t.id}>
                    <Link
                      href={`/directory/players/${t.slug ?? t.id}`}
                      style={{ color: '#5eead4', fontSize: '0.875rem' }}
                    >
                      {name}{t.jersey_number != null ? <span style={{ color: 'rgba(255,255,255,0.55)' }}> #{t.jersey_number}</span> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
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

        {/* Author bio + last-updated + sources + verification */}
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
