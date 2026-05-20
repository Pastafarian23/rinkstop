import type { Metadata } from 'next';
import { metadata as siteMetadata } from './metadata';
export { siteMetadata as metadata };

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yszheonqyyskkjoxoexk.supabase.co';
const SUPABASE_SERVICE_KEY = '***REMOVED***';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ------ Data fetching helpers ------------------------------------------------------------------------------------------------

async function getRinks(country: string) {
  const { data } = await supabase
    .from('rinks')
    .select('id, name, slug, city, country, address, phone, website, capacity, rink_type, is_active')
    .eq('country', country)
    .eq('is_active', true);
  return data ?? [];
}

async function getNHLPlayersFromCountry(country: string) {
  const { data } = await supabase
    .from('players')
    .select('id, name, slug, position, team, league, country')
    .eq('country', country)
    .eq('league', 'NHL');
  return data ?? [];
}

async function getAllNHLPlayers() {
  const { data } = await supabase
    .from('players')
    .select('id, name, slug, position, team, league, country')
    .eq('league', 'NHL');
  return data ?? [];
}

async function getLeagues(country: string) {
  const { data } = await supabase
    .from('leagues')
    .select('id, name, slug, country, sport')
    .or(`country.eq.${country},country.eq.PH`);
  return data ?? [];
}

// ------ JSON-LD helpers --------------------------------------------------------------------------------------------------------------

function faqJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Is hockey a popular sport in the Philippines?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Hockey is not yet a mainstream sport in the Philippines, but it has a dedicated and growing community. The Philippines is an IIHF member and has been developing its domestic hockey program since the early 2000s. Ice sports are concentrated in Metro Manila, where the country\'s only full-size ice rink operates.',
        },
      },
      {
        '@type': 'Question',
        name: 'Does the Philippines have an ice hockey league?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. The Philippine Ice Hockey League (PIHL) is the primary domestic competition, operating out of Manila\'s SOCCX Skate and Ice Arena. The league features several teams and runs a regular season. There is also the Philippine Hockey League (PHL), which encompasses broader roller and ice hockey programs across the country.',
        },
      },
      {
        '@type': 'Question',
        name: 'How many Filipinos play professionally in the NHL?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'As of 2025, there are no Filipinos who have played in the NHL. The Philippines is still developing its hockey talent pipeline. However, Filipino-Canadian and Filipino-American players have begun appearing in North American junior and college leagues, signaling potential future NHL representation.',
        },
      },
    ],
  };
}

function articleJsonLd(countryName: string, description: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `Hockey in the ${countryName}`,
    description,
    publisher: {
      '@type': 'Organization',
      name: 'RinkStop',
      url: 'https://rinkstop.com',
    },
    url: 'https://rinkstop.com/directory/philippines',
  };
}

// ------ Section components --------------------------------------------------------------------------------------------------------

function SectionHeader({ title }: { title: string }) {
  return (
    <h2
      style={{
        fontFamily: '"Bebas Neue", monospace',
        fontSize: '1.5rem',
        color: '#fff',
        borderLeft: '3px solid #C8102E',
        paddingLeft: '12px',
        marginBottom: '1.25rem',
        letterSpacing: '0.05em',
      }}
    >
      {title}
    </h2>
  );
}

function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: '#0f0f0f',
        border: '1px solid #1e1e1e',
        borderRadius: '6px',
        padding: '1.25rem',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ------ Main Page --------------------------------------------------------------------------------------------------------------------------

export default async function PhilippinesPage() {
  const [rinks, allNHLPlayers, leagues] = await Promise.all([
    getRinks('Philippines'),
    getAllNHLPlayers(),
    getLeagues('Philippines'),
  ]);

  // Filipino NHL players (country === 'Philippines' or Philippines-flagged)
  const filipinoNHLPlayers = allNHLPlayers.filter(
    (p) =>
      p.country === 'Philippines' ||
      (p.name ?? '').toLowerCase().includes('filipino'),
  );

  return (
    <main
      style={{
        background: '#0a0a0a',
        color: '#fff',
        minHeight: '100vh',
        fontFamily: 'monospace',
        padding: '0 1.5rem 4rem',
      }}
    >
      {/* script removed */}

      {/* ---- Breadcrumb ---- */}
      <nav
        aria-label="Breadcrumb"
        style={{
          padding: '1.25rem 0',
          fontSize: '0.8rem',
          color: '#888',
          borderBottom: '1px solid #1a1a1a',
        }}
      >
        <span>
          <a href="/" style={{ color: '#888', textDecoration: 'none' }}>
            RinkStop
          </a>
        </span>
        <span style={{ margin: '0 0.5rem', color: '#555' }}>›</span>
        <span>
          <a
            href="/directory"
            style={{ color: '#888', textDecoration: 'none' }}
          >
            Directory
          </a>
        </span>
        <span style={{ margin: '0 0.5rem', color: '#555' }}>›</span>
        <span style={{ color: '#C8102E' }}>Philippines</span>
      </nav>

      {/* ---- Hero ---- */}
      <header style={{ padding: '3rem 0 2.5rem' }}>
        <h1
          style={{
            fontFamily: '"Bebas Neue", monospace',
            fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
            color: '#fff',
            margin: 0,
            letterSpacing: '0.04em',
            lineHeight: 1,
          }}
        >
          HOCKEY IN THE PHILIPPINES
        </h1>
        <p
          style={{
            marginTop: '0.75rem',
            fontSize: '1rem',
            color: '#aaa',
            fontStyle: 'italic',
          }}
        >
          One nation, one ice rink, and a hockey scene built on passion.
        </p>
      </header>

      {/* ══════════════════════════════════════════
          NEWSWIRE  --  Latest Philippine Hockey News
      ══════════════════════════════════════════ */}
      <section style={{ marginBottom: '3.5rem' }}>
        <SectionHeader title="NEWSWIRE" />
        <div style={{
          background: '#111',
          border: '1px solid #222',
          borderTop: '3px solid #C8102E',
          borderRadius: '8px',
          padding: '2rem 2.5rem',
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: '2rem',
          alignItems: 'start',
        }}>
          <div>
            <div style={{
              display: 'inline-block',
              background: '#C8102E',
              color: '#fff',
              fontFamily: '"Bebas Neue", monospace',
              fontSize: '0.7rem',
              padding: '3px 10px',
              borderRadius: '3px',
              letterSpacing: '0.1em',
              marginBottom: '0.75rem',
            }}>
              LOCAL SCENES
            </div>
            <h3 style={{
              fontFamily: '"Bebas Neue", monospace',
              fontSize: 'clamp(1.4rem, 3vw, 2rem)',
              color: '#fff',
              margin: '0 0 0.75rem',
              letterSpacing: '0.03em',
              lineHeight: 1.1,
            }}>
              PHILIPPINES HOCKEY TAKES THE ICE
            </h3>
            <p style={{
              color: 'rgba(255,255,255,0.75)',
              fontSize: '0.95rem',
              lineHeight: 1.75,
              margin: '0 0 1rem',
              maxWidth: '600px',
            }}>
              Hockey Philippines named their men's roster for the 2026 World Championships — a milestone that would've seemed impossible a few years back. Ice hockey? In a country where basketball is religion? Yet here we are.
            </p>
            <p style={{
              color: 'rgba(255,255,255,0.75)',
              fontSize: '0.95rem',
              lineHeight: 1.75,
              margin: '0 0 1rem',
              maxWidth: '600px',
            }}>
              The Philippine Women's Ice Hockey Team already put the world on notice with a <strong style={{ color: '#fff' }}>SILVER medal at the 33rd SEA Games</strong>. Now the men's team is suiting up. Manila's SOCCX Skate and Ice Arena is the heartbeat of it all.
            </p>
            <p style={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: '0.875rem',
              lineHeight: 1.75,
              margin: 0,
              fontStyle: 'italic',
            }}>
              The beautiful thing about our sport? It doesn't care where you're from. The ice is the same everywhere.
            </p>
          </div>
          <div style={{ textAlign: 'right', paddingTop: '0.5rem' }}>
            <div style={{ fontSize: '3.5rem', lineHeight: 1 }}>🏒</div>
            <div style={{
              marginTop: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
              alignItems: 'flex-end',
            }}>
              <span style={{
                background: '#1a1a1a',
                color: '#aaa',
                fontSize: '0.65rem',
                padding: '3px 8px',
                borderRadius: '3px',
                fontFamily: 'monospace',
                border: '1px solid #333',
              }}>#LocalScenes</span>
              <span style={{
                background: '#1a1a1a',
                color: '#aaa',
                fontSize: '0.65rem',
                padding: '3px 8px',
                borderRadius: '3px',
                fontFamily: 'monospace',
                border: '1px solid #333',
              }}>#PHHockey</span>
              <span style={{
                background: '#1a1a1a',
                color: '#aaa',
                fontSize: '0.65rem',
                padding: '3px 8px',
                borderRadius: '3px',
                fontFamily: 'monospace',
                border: '1px solid #333',
              }}>#HockeyIsForEveryone</span>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          SECTION 1  --  OVERVIEW
      ══════════════════════════════════════════ */}
      <section style={{ marginBottom: '3.5rem' }}>
        <SectionHeader title="OVERVIEW" />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
          }}
        >
          {/* IIHF Member badge */}
          <Card>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                marginBottom: '0.5rem',
              }}
            >
              <span
                style={{
                  background: '#C8102E',
                  color: '#fff',
                  fontFamily: '"Bebas Neue", monospace',
                  fontSize: '0.75rem',
                  padding: '2px 8px',
                  borderRadius: '3px',
                  letterSpacing: '0.08em',
                }}
              >
                IIHF MEMBER
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#aaa' }}>
              The Philippines joined the International Ice Hockey Federation in
              2009. Currently ranked outside the top 50, the nation is building
              from the ground up with a focus on youth development and domestic
              league growth.
            </p>
          </Card>

          {/* NHL Players count */}
          <Card>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                marginBottom: '0.5rem',
              }}
            >
              <span
                style={{
                  background: '#0a3060',
                  color: '#fff',
                  fontFamily: '"Bebas Neue", monospace',
                  fontSize: '0.75rem',
                  padding: '2px 8px',
                  borderRadius: '3px',
                  letterSpacing: '0.08em',
                }}
              >
                NHL PROS
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>
              {filipinoNHLPlayers.length}
            </p>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#777' }}>
              Filipino players in RinkStop database
            </p>
          </Card>

          {/* Domestic Leagues */}
          <Card>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                marginBottom: '0.5rem',
              }}
            >
              <span
                style={{
                  background: '#1a1a1a',
                  color: '#fff',
                  fontFamily: '"Bebas Neue", monospace',
                  fontSize: '0.75rem',
                  padding: '2px 8px',
                  borderRadius: '3px',
                  border: '1px solid #C8102E',
                  letterSpacing: '0.08em',
                }}
              >
                DOMESTIC LEAGUES
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>
              {leagues.length}
            </p>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#777' }}>
              registered in RinkStop DB
            </p>
          </Card>

          {/* Rinks */}
          <Card>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                marginBottom: '0.5rem',
              }}
            >
              <span
                style={{
                  background: '#1a1a1a',
                  color: '#fff',
                  fontFamily: '"Bebas Neue", monospace',
                  fontSize: '0.75rem',
                  padding: '2px 8px',
                  borderRadius: '3px',
                  border: '1px solid #C8102E',
                  letterSpacing: '0.08em',
                }}
              >
                REGISTERED RINKS
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>
              {rinks.length}
            </p>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#777' }}>
              ice &amp; roller facilities
            </p>
          </Card>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          SECTION 2  --  HOCKEY CONTEXT
      ══════════════════════════════════════════ */}
      <section style={{ marginBottom: '3.5rem' }}>
        <SectionHeader title="HOCKEY CONTEXT" />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1rem',
          }}
        >
          {/* IIHF context */}
          <Card>
            <h3
              style={{
                fontFamily: '"Bebas Neue", monospace',
                fontSize: '1.1rem',
                color: '#C8102E',
                margin: '0 0 0.75rem',
                letterSpacing: '0.05em',
              }}
            >
              IIHF MEMBERSHIP
            </h3>
            <p style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', color: '#ccc', lineHeight: 1.6 }}>
              The Philippines became the 70th member of the IIHF in 2009,
              signalling serious intent to grow ice hockey in a tropical
              nation. The country has no tradition of outdoor ice, yet its
              passion for basketball and roller skating translates into
              surprising athleticism on ice.
            </p>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#ccc', lineHeight: 1.6 }}>
              IIHF funding and development programs have helped send Filipino
              coaches to international certification courses. The national team
              has participated in IIHF Challenge Cups of Asia, where it competes
              against Thailand, the UAE, and Kuwait.
            </p>
          </Card>

          {/* NHL context */}
          <Card>
            <h3
              style={{
                fontFamily: '"Bebas Neue", monospace',
                fontSize: '1.1rem',
                color: '#0a3060',
                margin: '0 0 0.75rem',
                letterSpacing: '0.05em',
              }}
            >
              NHL &amp; FILIPINO REPRESENTATION
            </h3>
            <p style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', color: '#ccc', lineHeight: 1.6 }}>
              No Filipino-born players have reached the NHL to date. However,
              the diaspora has begun producing talent  --  Filipino-Canadian and
              Filipino-American players have appeared in USHL, NCAA Division I,
              and Canadian junior leagues.
            </p>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#ccc', lineHeight: 1.6 }}>
              As youth hockey programs in Manila mature and more Filipino
              families in North America encourage their children in the sport,
              scouts anticipate a Filipino NHL player within the next decade.
              RinkStop tracks these players as the pipeline grows.
            </p>
          </Card>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          SECTION 3  --  DOMESTIC LEAGUES
      ══════════════════════════════════════════ */}
      <section style={{ marginBottom: '3.5rem' }}>
        <SectionHeader title="DOMESTIC LEAGUES" />
        {leagues.length === 0 ? (
          <p style={{ color: '#666', fontSize: '0.9rem' }}>
            No domestic leagues registered yet.{' '}
            <a href="/directory/submit" style={{ color: '#C8102E' }}>
              Submit one
            </a>
            .
          </p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '1rem',
            }}
          >
            {leagues.map((league) => (
              <Card key={league.id}>
                <h4
                  style={{
                    fontFamily: '"Bebas Neue", monospace',
                    fontSize: '1rem',
                    color: '#fff',
                    margin: '0 0 0.4rem',
                    letterSpacing: '0.04em',
                  }}
                >
                  {league.name}
                </h4>
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.75rem',
                    color: '#888',
                    fontFamily: 'monospace',
                  }}
                >
                  {league.sport ?? 'Ice Hockey'} &nbsp;·&nbsp;{' '}
                  {league.country === 'PH' ? 'Philippines' : league.country}
                </p>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════
          SECTION 4  --  NHL PROS FROM THE PHILIPPINES
      ══════════════════════════════════════════ */}
      <section style={{ marginBottom: '3.5rem' }}>
        <SectionHeader title="NHL PROS FROM THE PHILIPPINES" />
        {filipinoNHLPlayers.length === 0 ? (
          <Card>
            <p
              style={{
                margin: 0,
                color: '#888',
                fontSize: '0.9rem',
                textAlign: 'center',
                padding: '1rem 0',
              }}
            >
              No Filipino players currently tracked in the NHL. The pipeline
              is developing  --  check back as youth programs mature.
            </p>
          </Card>
        ) : (
          <div
            style={{
              background: '#0f0f0f',
              border: '1px solid #1e1e1e',
              borderRadius: '6px',
              overflow: 'hidden',
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.85rem',
                fontFamily: 'monospace',
              }}
            >
              <thead>
                <tr
                  style={{
                    background: '#141414',
                    borderBottom: '1px solid #1e1e1e',
                  }}
                >
                  {['PLAYER', 'POSITION', 'TEAM', 'LEAGUE'].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '0.75rem 1rem',
                        textAlign: 'left',
                        color: '#888',
                        fontFamily: '"Bebas Neue", monospace',
                        letterSpacing: '0.06em',
                        fontSize: '0.75rem',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filipinoNHLPlayers.map((p, i) => (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom:
                        i < filipinoNHLPlayers.length - 1
                          ? '1px solid #141414'
                          : 'none',
                    }}
                  >
                    <td
                      style={{
                        padding: '0.7rem 1rem',
                        color: '#fff',
                      }}
                    >
                      {p.name}
                    </td>
                    <td
                      style={{
                        padding: '0.7rem 1rem',
                        color: '#aaa',
                      }}
                    >
                      {p.position ?? ' -- '}
                    </td>
                    <td
                      style={{
                        padding: '0.7rem 1rem',
                        color: '#aaa',
                      }}
                    >
                      {p.team ?? ' -- '}
                    </td>
                    <td
                      style={{
                        padding: '0.7rem 1rem',
                        color: '#0a3060',
                        fontFamily: '"Bebas Neue", monospace',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {p.league}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════
          SECTION 5  --  RINK DIRECTORY
      ══════════════════════════════════════════ */}
      <section style={{ marginBottom: '3.5rem' }}>
        <SectionHeader title="RINK DIRECTORY" />
        {rinks.length === 0 ? (
          <p style={{ color: '#666', fontSize: '0.9rem' }}>
            No rinks registered in the Philippines.{' '}
            <a href="/directory/submit" style={{ color: '#C8102E' }}>
              Submit a rink
            </a>
            .
          </p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '1rem',
            }}
          >
            {rinks.map((rink) => (
              <Card key={rink.id}>
                <h4
                  style={{
                    fontFamily: '"Bebas Neue", monospace',
                    fontSize: '1rem',
                    color: '#fff',
                    margin: '0 0 0.4rem',
                    letterSpacing: '0.04em',
                  }}
                >
                  {rink.name}
                </h4>
                <p
                  style={{
                    margin: '0 0 0.3rem',
                    fontSize: '0.75rem',
                    color: '#888',
                    fontFamily: 'monospace',
                  }}
                >
                  {rink.city}
                  {rink.address ? ` · ${rink.address}` : ''}
                </p>
                {rink.rink_type && (
                  <p
                    style={{
                      margin: '0 0 0.3rem',
                      fontSize: '0.72rem',
                      color: '#C8102E',
                      fontFamily: '"Bebas Neue", monospace',
                      letterSpacing: '0.06em',
                    }}
                  >
                    {rink.rink_type.toUpperCase()}
                  </p>
                )}
                {rink.capacity && (
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.72rem',
                      color: '#555',
                      fontFamily: 'monospace',
                    }}
                  >
                    Capacity: {rink.capacity.toLocaleString()}
                  </p>
                )}
                {rink.website && (
                  <a
                    href={rink.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-block',
                      marginTop: '0.6rem',
                      fontSize: '0.72rem',
                      color: '#C8102E',
                      fontFamily: 'monospace',
                    }}
                  >
                    Visit Website →
                  </a>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}