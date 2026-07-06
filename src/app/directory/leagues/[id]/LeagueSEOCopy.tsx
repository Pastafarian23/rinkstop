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
import { COUNTRY_HOCKEY_CONTEXT } from '@/lib/league-context';

interface Props {
  league: any;
  teamCount: number;
  levelDesc: { oneLiner: string; paragraph: string; rinksUs: string };
  countryContext: string;
  faqs: { question: string; answer: string }[];
}

export default function LeagueSEOCopy({ league, teamCount, levelDesc, countryContext, faqs }: Props) {
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
          {displayName} is a {(level && level !== 'other' ? level : '')} ice hockey league{country ? ` based in ${country}` : ''}.
          {' '}The RinkStop directory currently has {teamCountLabel} for this league. {levelDesc.oneLiner}
        </p>

        <p style={{ color: 'rgba(255,255,255,0.78)', lineHeight: 1.7, margin: '0 0 0.75rem', fontSize: '0.95rem' }}>
          {levelDesc.paragraph}
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
