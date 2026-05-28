import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
);

export const metadata: Metadata = {
  title: 'Hockey in Sweden | RinkStop',
  description: 'Sweden is a perennial hockey powerhouse. SHL, Allsvenskan, and a world-class player development system producing NHL stars.',
  alternates: { canonical: 'https://rinkstop.com/directory/sweden' },
  openGraph: { title: 'Hockey in Sweden | RinkStop', description: 'Perennial hockey powerhouse. SHL, Allsvenskan, and NHL pipeline.', type: 'article' },
};

export default async function SwedenPage() {
  const [{ data: leagues }, { data: rinks }] = await Promise.all([
    supabase
      .from('leagues')
      .select('*')
      .or(`country.ilike.%weden%,slug.ilike.%shl%`),
    supabase
      .from('rinks')
      .select('*')
      .eq('country', 'Sweden')
      .eq('is_active', true),
  ]);

  const swedishNhlPlayers = [
    { name: 'Erik Karlsson', team: 'Pittsburgh Penguins', position: 'Defense', nationality: 'Swedish' },
    { name: 'Victor Hedman', team: 'Tampa Bay Lightning', position: 'Defense', nationality: 'Swedish' },
    { name: 'William Nylander', team: 'Toronto Maple Leafs', position: 'Right Wing', nationality: 'Swedish' },
    { name: 'Elias Pettersson', team: 'Vancouver Canucks', position: 'Center', nationality: 'Swedish' },
    { name: 'Filip Forsberg', team: 'Nashville Predators', position: 'Left Wing', nationality: 'Swedish' },
    { name: 'Jesper Bratt', team: 'New Jersey Devils', position: 'Right Wing', nationality: 'Swedish' },
    { name: 'Jacob Markström', team: 'Calgary Flames', position: 'Goaltender', nationality: 'Swedish' },
    { name: 'Mikael Backlund', team: 'Calgary Flames', position: 'Center', nationality: 'Swedish' },
    { name: 'Nicklas Lidström', team: 'Retired (Detroit Red Wings)', position: 'Defense', nationality: 'Swedish' },
    { name: 'Oliver Ekman-Larsson', team: 'Vancouver Canucks', position: 'Defense', nationality: 'Swedish' },
  ];

  const swedishRinks = rinks ?? [];

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'How many Swedes play in the NHL?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Sweden consistently has between 70-90 players in the NHL, making it one of the top source countries for NHL talent alongside Canada, the USA, and Russia.',
        },
      },
      {
        '@type': 'Question',
        name: 'What is the SHL?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: "The SHL (Svenska Hockeyligan) is Sweden's top professional hockey league. Founded in 1975, it features 14 teams and is considered one of the strongest leagues in Europe.",
        },
      },
      {
        '@type': 'Question',
        name: 'Why does Sweden produce so many hockey players?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: "Sweden's success stems from a national investment in youth development, a strong club system with excellent facilities, and a culture that treats hockey as a national sport. The Vassijaure model of early specialization and structured development has been refined over decades.",
        },
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <div style={{ background: '#0a0a0a', color: '#fff', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
        {/* Breadcrumb */}
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 24px 0', fontSize: 13, color: '#888' }}>
          <span>RinkStop</span>
          <span style={{ margin: '0 8px', color: '#555' }}>›</span>
          <span>Directory</span>
          <span style={{ margin: '0 8px', color: '#555' }}>›</span>
          <span style={{ color: '#C8102E' }}>Sweden</span>
        </div>

        {/* Hero */}
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 24px' }}>
          <h1 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 'clamp(48px, 8vw, 96px)', letterSpacing: '0.04em', color: '#fff', margin: 0, lineHeight: 1 }}>
            HOCKEY IN SWEDEN
          </h1>
          <p style={{ fontSize: 18, color: '#aaa', marginTop: 16, maxWidth: 640, lineHeight: 1.6 }}>
            A hockey nation built on technique, system, and a culture that produces top-end talent generation after generation.
          </p>
        </div>

        {/* Stats Row */}
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 48px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {[
              { label: 'IIHF World Rank', value: '#4' },
              { label: 'Swedish NHL Players', value: '~80' },
              { label: 'Swedish Rinks', value: String(swedishRinks.length) },
              { label: 'SHL Teams', value: '14' },
            ].map((stat) => (
              <div key={stat.label} style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 8, padding: '24px 20px', textAlign: 'center' }}>
                <div style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 48, color: '#C8102E', lineHeight: 1 }}>{stat.value}</div>
                <div style={{ fontSize: 13, color: '#888', marginTop: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Hockey Culture */}
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 64px' }}>
          <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 36, letterSpacing: '0.04em', borderLeft: '3px solid #C8102E', paddingLeft: 12, marginBottom: 32 }}>
            THE SWEDISH HOCKEY CULTURE
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            <div style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 8, padding: 28 }}>
              <h3 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 22, letterSpacing: '0.04em', marginBottom: 12, color: '#fff' }}>
                A National Obsession
              </h3>
              <p style={{ fontSize: 15, color: '#aaa', lineHeight: 1.7, margin: 0 }}>
                Ice hockey is Sweden&apos;s national sport, played and followed with a passion found in few other countries. From the frozen lakes of the north to the purpose-built arenas of Stockholm and Gothenburg, hockey is woven into the fabric of Swedish life. The Vassijaure model — named after the pioneering youth program in northern Sweden — emphasizes early technical development, tactical intelligence, and a team-first mentality. Swedish players are renowned for their skating efficiency, stickhandling, and composure under pressure.
              </p>
            </div>
            <div style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 8, padding: 28 }}>
              <h3 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 22, letterSpacing: '0.04em', marginBottom: 12, color: '#fff' }}>
                Tre Kronor&apos;s Legacy
              </h3>
              <p style={{ fontSize: 15, color: '#aaa', lineHeight: 1.7, margin: 0 }}>
                Organized hockey in Sweden dates back to the 1910s, with Tre Kronor (Three Crowns) — the national team — becoming a dominant force in international competition. Sweden won Olympic gold in 1992 and 2006, and has accumulated multiple IIHF World Championship titles. Swedish development pipelines from junior leagues through the SHL to the NHL are considered among the most professional and effective in the world, consistently feeding the league with two-way players and elite defensemen.
              </p>
            </div>
          </div>
        </div>

        {/* Leagues */}
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 64px' }}>
          <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 36, letterSpacing: '0.04em', borderLeft: '3px solid #C8102E', paddingLeft: 12, marginBottom: 32 }}>
            LEAGUES IN SWEDEN
          </h2>
          {leagues && leagues.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
              {leagues.map((league) => (
                <div key={league.id} style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 8, padding: 20 }}>
                  <h3 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 20, letterSpacing: '0.04em', margin: '0 0 8px', color: '#fff' }}>
                    {league.name}
                  </h3>
                  <p style={{ fontSize: 13, color: '#C8102E', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {league.sport} {league.country ? ` - ${league.country}` : ''}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
              {['SHL — Svenska Hockeyligan', 'Hockeyallsvenskan — Allsvenskan', 'J20 SuperElit', 'J18 Allsvenskan'].map((name) => (
                <div key={name} style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 8, padding: 20 }}>
                  <h3 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 20, letterSpacing: '0.04em', margin: 0, color: '#fff' }}>
                    {name}
                  </h3>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* NHL Stars */}
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 64px' }}>
          <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 36, letterSpacing: '0.04em', borderLeft: '3px solid #C8102E', paddingLeft: 12, marginBottom: 32 }}>
            SWEDISH NHL STARS
          </h2>
          <div style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1e1e1e' }}>
                  {['Player', 'Team', 'Position', 'Country'].map((h) => (
                    <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {swedishNhlPlayers.map((player, i) => (
                  <tr key={player.name} style={{ borderBottom: i < swedishNhlPlayers.length - 1 ? '1px solid #161616' : 'none' }}>
                    <td style={{ padding: '14px 16px', fontSize: 15, color: '#fff' }}>{player.name}</td>
                    <td style={{ padding: '14px 16px', fontSize: 14, color: '#aaa' }}>{player.team}</td>
                    <td style={{ padding: '14px 16px', fontSize: 14, color: '#aaa' }}>{player.position}</td>
                    <td style={{ padding: '14px 16px', fontSize: 14, color: '#C8102E' }}>SE {player.nationality}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Swedish Rinks */}
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 80px' }}>
          <h2 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 36, letterSpacing: '0.04em', borderLeft: '3px solid #C8102E', paddingLeft: 12, marginBottom: 32 }}>
            SWEDISH RINKS
          </h2>
          {swedishRinks.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {swedishRinks.map((rink) => (
                <Link
                  key={rink.id}
                  href={`/directory/rinks/${rink.id}`}
                  style={{
                    display: 'block',
                    background: '#0f0f0f',
                    border: '1px solid #1e1e1e',
                    borderRadius: 8,
                    padding: 20,
                    textDecoration: 'none',
                    transition: 'border-color 0.2s',
                  }}
                >
                  <h3 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 20, letterSpacing: '0.04em', margin: '0 0 8px', color: '#fff' }}>
                    {rink.name}
                  </h3>
                  <p style={{ fontSize: 13, color: '#888', margin: '0 0 4px' }}>
                    {rink.city}{rink.address ? ` - ${rink.address}` : ''}
                  </p>
                  <p style={{ fontSize: 13, color: '#C8102E', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {rink.rink_type ?? 'Arena'}{rink.capacity ? ` - Cap: ${rink.capacity.toLocaleString()}` : ''}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <p style={{ color: '#555', fontSize: 15 }}>No active rinks found in Sweden.</p>
          )}
        </div>
      </div>
    </>
  );
}