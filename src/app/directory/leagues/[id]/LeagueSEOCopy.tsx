/**
 * Server-rendered SEO content for league pages.
 *
 * Renders the unique, useful prose that Googlebot can crawl directly from
 * the initial HTML — FAQs, country context, level explanation, author bio,
 * and last-updated timestamp. Targets 600-800 words of unique visible text
 * per league page (up from the previous ~98).
 *
 * Why a separate file: keeps the question of "what does this page say to
 * Google" out of LeagueDetailClient, which is a client component concerned
 * only with interactivity.
 */

import Link from 'next/link';
import { COUNTRY_HOCKEY_CONTEXT, formatLevelSentence } from '@/lib/league-context';

interface Props {
  league: any;
  teamCount: number;
  levelDesc: { oneLiner: string; paragraph: string; rinksUs: string };
  countryContext: string;
  faqs: { question: string; answer: string }[];
  recentFixtures?: any[];
  upcomingFixtures?: any[];
  topTeams?: any[];
  seasonYear?: number | null;
}

export default function LeagueSEOCopy({ league, teamCount, levelDesc, countryContext, faqs, recentFixtures = [], upcomingFixtures = [], topTeams = [], seasonYear = null }: Props) {
  const displayName: string = league.name;
  const country: string = league.country || '';
  const level: string = (league.level || '').toLowerCase();
  const teamCountLabel = teamCount === 0
    ? 'we do not yet have teams tracked'
    : `${teamCount} team${teamCount === 1 ? '' : 's'}`;
  const founded = league.founded_year || null;
  const updated = league.updated_at
    ? new Date(league.updated_at).toISOString().slice(0, 10)
    : null;

  return (
    <section
      aria-label={`About ${displayName}`}
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
          About {displayName}
        </h2>

        <p style={{ color: 'rgba(255,255,255,0.85)', lineHeight: 1.7, margin: '0 0 0.75rem', fontSize: '1rem' }}>
          {formatLevelSentence(displayName, levelDesc)}{country ? ` based in ${country}` : ''}.{' '}
          {teamCount > 0
            ? `RinkStop currently tracks ${teamCountLabel} for this league, with each team having a full profile page linking to roster, schedule, and recent results.`
            : 'Full team pages, schedules, and results appear below as teams are added to the directory.'}
        </p>

        <p style={{ color: 'rgba(255,255,255,0.78)', lineHeight: 1.7, margin: '0 0 0.75rem', fontSize: '0.95rem' }}>
          {levelDesc.paragraph}
        </p>

        {/* 2026-10-09 WS-49: dynamic "How {League} works" section. Each
            statement is grounded in entity data (level, team count, season)
            so the content is unique per league. Long-tail targets: 'X games
            per season', 'X schedule', 'X season start', 'X format'. */}
        <h3
          style={{
            fontFamily: '"Bebas Neue", sans-serif',
            fontSize: '1.125rem',
            letterSpacing: '0.04em',
            color: '#fff',
            margin: '1.25rem 0 0.5rem',
          }}
        >
          How {displayName} works
        </h3>
        <p style={{ color: 'rgba(255,255,255,0.78)', lineHeight: 1.7, margin: '0 0 0.75rem', fontSize: '0.95rem' }}>
          {teamCount > 0
            ? `${displayName} fields ${teamCount} active team${teamCount === 1 ? '' : 's'} tracked by RinkStop${country ? ` across ${country}` : ''}.`
            : `${displayName} is tracked in the RinkStop directory; full team lists, schedules, and standings are added as the season progresses.`
          }
          {seasonYear
            ? ` The ${seasonYear} season is in the RinkStop fixtures database${recentFixtures.length > 0 ? `, with ${recentFixtures.length} recent result${recentFixtures.length === 1 ? '' : 's'} on record` : ''}.`
            : level === 'professional' || level === 'junior' || level === 'college'
            ? ' Most seasons run from September through April, with playoffs extending into May or June.'
            : ''
          }
          {level === 'professional'
            ? ' Professional leagues at this level typically play a 60-82 game regular season, depending on conference structure, with best-of-seven playoff rounds leading to a league championship.'
            : level === 'junior'
            ? ' Major-junior leagues typically play a 68-game regular season running in line with the academic calendar, with league-wide playoffs concluding in May.'
            : level === 'college'
            ? ' College hockey seasons typically run from October through early April, with conference tournaments and a national championship determining the season winner.'
            : level === 'youth'
            ? ' Youth hockey seasons follow the school year, with house, travel, and select tiers allowing players of different competitive levels to participate in the same league structure.'
            : level === 'amateur'
            ? ' Amateur and recreational leagues run shorter seasons than the professional ranks, with most adult play concentrated in the fall through early spring.'
            : ''
          }
        </p>

        {country && countryContext && (
          <>
            <h3
              style={{
                fontFamily: '"Bebas Neue", sans-serif',
                fontSize: '1.125rem',
                letterSpacing: '0.04em',
                color: '#fff',
                margin: '1.25rem 0 0.5rem',
              }}
            >
              Hockey in {country}
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.78)', lineHeight: 1.7, margin: '0 0 0.75rem', fontSize: '0.95rem' }}>
              {countryContext}
            </p>
          </>
        )}

        {/* 2026-10-09 WS-49: dynamic Recent Results + Upcoming Games sections.
            Pulled server-side in page.tsx from the fixtures table. Only renders
            for leagues with at least one game tracked. Each row is a unique
            sentence that Google can index and users can click through. */}
        {recentFixtures.length > 0 && (
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
              Recent results {seasonYear ? `(${seasonYear})` : ''}
            </h3>
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                margin: '0 0 0.5rem',
                display: 'grid',
                gap: '0.375rem',
              }}
            >
              {recentFixtures.map((f: any) => {
                const date = f.scheduled_at ? new Date(f.scheduled_at).toISOString().slice(0, 10) : '';
                const homeName = f.home_team?.name || 'Home';
                const awayName = f.away_team?.name || 'Away';
                return (
                  <li
                    key={f.id}
                    style={{
                      display: 'flex',
                      gap: '0.5rem',
                      alignItems: 'baseline',
                      fontSize: '0.875rem',
                      color: 'rgba(255,255,255,0.78)',
                      borderTop: '1px solid var(--border)',
                      paddingTop: '0.375rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontVariantNumeric: 'tabular-nums', minWidth: 80 }}>
                      {date}
                    </span>
                    <span style={{ color: '#fff', fontWeight: 600, minWidth: 60 }}>
                      {f.home_score}–{f.away_score}
                    </span>
                    <span style={{ flex: '1 1 auto', minWidth: 200 }}>
                      {f.home_team?.slug ? (
                        <Link href={`/directory/teams/${f.home_team.slug}`} style={{ color: 'rgba(255,255,255,0.85)' }}>
                          {homeName}
                        </Link>
                      ) : (
                        <span>{homeName}</span>
                      )}
                      <span style={{ color: 'rgba(255,255,255,0.4)', margin: '0 0.4rem' }}>vs</span>
                      {f.away_team?.slug ? (
                        <Link href={`/directory/teams/${f.away_team.slug}`} style={{ color: 'rgba(255,255,255,0.85)' }}>
                          {awayName}
                        </Link>
                      ) : (
                        <span>{awayName}</span>
                      )}
                    </span>
                    <span>
                      <Link href={`/scores/${f.id}`} style={{ color: '#5eead4', fontSize: '0.78rem' }}>
                        Box score
                      </Link>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {upcomingFixtures.length > 0 && (
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
              Upcoming games
            </h3>
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                margin: '0 0 0.5rem',
                display: 'grid',
                gap: '0.375rem',
              }}
            >
              {upcomingFixtures.map((f: any) => {
                const date = f.scheduled_at ? new Date(f.scheduled_at).toISOString().slice(0, 10) : '';
                const homeName = f.home_team?.name || 'Home';
                const awayName = f.away_team?.name || 'Away';
                return (
                  <li
                    key={f.id}
                    style={{
                      display: 'flex',
                      gap: '0.5rem',
                      alignItems: 'baseline',
                      fontSize: '0.875rem',
                      color: 'rgba(255,255,255,0.78)',
                      borderTop: '1px solid var(--border)',
                      paddingTop: '0.375rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontVariantNumeric: 'tabular-nums', minWidth: 80 }}>
                      {date}
                    </span>
                    <span style={{ flex: '1 1 auto', minWidth: 200 }}>
                      {f.home_team?.slug ? (
                        <Link href={`/directory/teams/${f.home_team.slug}`} style={{ color: 'rgba(255,255,255,0.85)' }}>
                          {homeName}
                        </Link>
                      ) : (
                        <span>{homeName}</span>
                      )}
                      <span style={{ color: 'rgba(255,255,255,0.4)', margin: '0 0.4rem' }}>vs</span>
                      {f.away_team?.slug ? (
                        <Link href={`/directory/teams/${f.away_team.slug}`} style={{ color: 'rgba(255,255,255,0.85)' }}>
                          {awayName}
                        </Link>
                      ) : (
                        <span>{awayName}</span>
                      )}
                    </span>
                    <span>
                      <Link href={`/scores/${f.id}`} style={{ color: '#5eead4', fontSize: '0.78rem' }}>
                        Preview
                      </Link>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* 2026-10-09 WS-49: Top Teams list. Cross-links to team pages. */}
        {topTeams.length > 0 && (
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
              Teams in {displayName}
            </h3>
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                margin: '0 0 0.5rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: '0.375rem',
              }}
            >
              {topTeams.map((t: any) => (
                <li
                  key={t.id}
                  style={{
                    display: 'flex',
                    gap: '0.5rem',
                    alignItems: 'center',
                    fontSize: '0.875rem',
                    color: 'rgba(255,255,255,0.78)',
                    borderTop: '1px solid var(--border)',
                    paddingTop: '0.375rem',
                  }}
                >
                  {t.logo_url && (
                    <img src={t.logo_url} alt="" style={{ width: 20, height: 20, objectFit: 'contain', background: '#1a2D45', borderRadius: 3 }} loading="lazy" />
                  )}
                  <Link href={`/directory/teams/${t.slug}`} style={{ color: '#5eead4' }}>
                    {t.name}
                  </Link>
                </li>
              ))}
            </ul>
            {teamCount > topTeams.length && (
              <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', margin: '0.25rem 0 0' }}>
                Showing {topTeams.length} of {teamCount} teams.{' '}
                <Link href={`/directory/teams?league=${league.slug || league.id}`} style={{ color: '#5eead4' }}>
                  View all teams →
                </Link>
              </p>
            )}
          </div>
        )}

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
                <div key={i} style={{ marginBottom: '0.875rem', borderTop: i === 0 ? '1px solid var(--border)' : undefined, paddingTop: i === 0 ? '0.75rem' : undefined }}>
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

        {/* Internal linking — encourages crawlers and visitors to discover more */}
        <nav
          aria-label={`Related ${displayName} pages`}
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
              <Link href="/directory/leagues" style={{ color: '#5eead4' }}>All hockey leagues tracked by RinkStop</Link>
            </li>
            <li>
              <Link href="/directory/teams" style={{ color: '#5eead4' }}>Browse ice hockey teams worldwide</Link>
            </li>
            {country && (
              <li>
                <Link href={`/directory/${country.toLowerCase().replace(/\s+/g, '-')}`} style={{ color: '#5eead4' }}>
                  Hockey in {country} — rinks, teams, and leagues
                </Link>
              </li>
            )}
            <li>
              <Link href="/tools/hockey-cost-calculator" style={{ color: '#5eead4' }}>
                Estimate hockey costs by level
              </Link>
            </li>
            <li>
              <Link href="/about-author" style={{ color: '#5eead4' }}>
                About the RinkStop editorial team
              </Link>
            </li>
          </ul>
        </nav>

        {/* Author bio + last-updated — E-E-A-T signal */}
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
                ? `League record last updated: ${updated}`
                : 'League record last reviewed this season.'}
              {founded ? ` • Founded ${founded}` : ''}
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
