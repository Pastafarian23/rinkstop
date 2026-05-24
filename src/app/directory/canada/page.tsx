import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
);

export const metadata: Metadata = {
  title: 'Hockey in Canada | RinkStop',
  description: 'The birthplace of hockey. From NHL superstars to minor junior leagues  --  everything about hockey in Canada.',
  alternates: { canonical: 'https://rinkstop.com/directory/canada' },
  openGraph: { title: 'Hockey in Canada | RinkStop', description: 'The birthplace of hockey.', type: 'article' },
};

const CANADIAN_NHL_PLAYERS = [
  { name: 'Connor McDavid', team: 'Edmonton Oilers', position: 'C' },
  { name: 'Auston Matthews', team: 'Toronto Maple Leafs', position: 'C' },
  { name: 'Nathan MacKinnon', team: 'Colorado Avalanche', position: 'C' },
  { name: 'Sidney Crosby', team: 'Pittsburgh Penguins', position: 'C' },
  { name: 'Cale Makar', team: 'Colorado Avalanche', position: 'D' },
  { name: 'Mark Scheifele', team: 'Winnipeg Jets', position: 'C' },
  { name: 'Brad Marchand', team: 'Boston Bruins', position: 'LW' },
  { name: 'Alex Pietrangelo', team: 'Vegas Golden Knights', position: 'D' },
  { name: 'Mitch Marner', team: 'Toronto Maple Leafs', position: 'RW' },
  { name: 'Francis Bouillon', team: 'Montreal Canadiens', position: 'D' },
];

const CANADIAN_LEAGUES = [
  { name: 'NHL', slug: 'nhl', description: 'National Hockey League  --  the world\'s premier professional league.' },
  { name: 'AHL', slug: 'ahl', description: 'American Hockey League  --  the primary developmental league for the NHL.' },
  { name: 'OHL', slug: 'ohl', description: 'Ontario Hockey League  --  one of three CHL major junior leagues.' },
  { name: 'WHL', slug: 'whl', description: 'Western Hockey League  --  major junior league spanning Western Canada and US.' },
  { name: 'QMJHL', slug: 'qmjhl', description: 'Quebec Major Junior Hockey League  --  producing countless NHL stars.' },
  { name: 'ECHL', slug: 'echl', description: 'ECHL  --  the lower-tier professional league with teams across North America.' },
];

const FAQ_DATA = [
  {
    question: 'How many Canadians play in the NHL?',
    answer: 'Historically, Canadians have made up the largest nationality in the NHL. In recent seasons, roughly 45-50% of NHL players are Canadian-born, though that share has been shared more with American and European players in recent decades.',
  },
  {
    question: 'What is the CHL?',
    answer: 'The Canadian Hockey League is the umbrella organization for the OHL, WHL, and QMJHL  --  the three major junior leagues that serve as the primary development pathway for NHL prospects in Canada.',
  },
  {
    question: 'How many rinks are in Canada?',
    answer: 'Canada has the highest number of indoor ice rinks per capita in the world, with estimates ranging from 2,500 to 3,000+ rinks across the country for a population of roughly 40 million.',
  },
];

export default async function CanadaPage() {
  // Fetch stats in parallel
  const [
    { count: rinksCount },
    { data: leaguesData },
  ] = await Promise.all([
    supabase
      .from('rinks')
      .select('*', { count: 'exact', head: true })
      .ilike('country', '%anada%'),
    supabase
      .from('leagues')
      .select('*')
      .or(`country.ilike.%anada%,slug.ilike.%chl%`),
  ]);

  const canadianRinks = await supabase
    .from('rinks')
    .select('name, city, rink_type, capacity')
    .ilike('country', '%anada%')
    .limit(12);

  return (
    <>
      {/* FAQPage JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: FAQ_DATA.map((faq) => ({
              '@type': 'Question',
              name: faq.question,
              acceptedAnswer: {
                '@type': 'Answer',
                text: faq.answer,
              },
            })),
          }),
        }}
      />

      {/* Article JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: 'Hockey in Canada',
            description: 'The birthplace of hockey. From NHL superstars to minor junior leagues  --  everything about hockey in Canada.',
            url: 'https://rinkstop.com/directory/canada',
            publisher: {
              '@type': 'Organization',
              name: 'RinkStop',
              url: 'https://rinkstop.com',
            },
          }),
        }}
      />

      <div style={{ background: '#0a0a0a', color: '#fff', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
        {/* Breadcrumb */}
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 24px 0', fontSize: 13, color: '#888' }}>
          <span>RinkStop</span>
          <span style={{ margin: '0 8px', color: '#555' }}>›</span>
          <span>Directory</span>
          <span style={{ margin: '0 8px', color: '#555' }}>›</span>
          <span style={{ color: '#C8102E' }}>Canada</span>
        </div>

        {/* Hero */}
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 24px 40px' }}>
          <h1 style={{
            fontFamily: '"Bebas Neue", sans-serif',
            fontSize: 'clamp(2.5rem, 6vw, 4rem)',
            letterSpacing: '0.05em',
            margin: '0 0 16px',
            lineHeight: 1.1,
          }}>
            HOCKEY IN CANADA
          </h1>
          <p style={{ fontSize: '1.1rem', color: '#ccc', maxWidth: 640, lineHeight: 1.6, margin: 0 }}>
            The birthplace of the game. More registered players, more rinks, and more NHL talent than any other country on Earth.
          </p>
        </div>

        {/* Stats Row */}
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 64px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {[
            { label: 'IIHF World Rank', value: '#1', sub: 'Men\'s Hockey' },
            { label: 'NHL Players from Canada', value: '~45%', sub: 'of all NHL players' },
            { label: 'Registered Rinks', value: rinksCount ? String(rinksCount) : '2,500+', sub: 'across Canada' },
            { label: 'Canadian NHL Teams', value: '7', sub: 'Toronto, Montreal, Vancouver, Calgary, Edmonton, Ottawa, Winnipeg' },
          ].map((stat) => (
            <div key={stat.label} style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 8, padding: '24px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontFamily: '"Bebas Neue", sans-serif', color: '#C8102E', letterSpacing: '0.05em' }}>{stat.value}</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff', marginTop: 4 }}>{stat.label}</div>
              <div style={{ fontSize: '0.75rem', color: '#666', marginTop: 4 }}>{stat.sub}</div>
            </div>
          ))}
        </div>

        {/* Hockey Culture */}
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 64px' }}>
          <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '2rem', letterSpacing: '0.05em', borderLeft: '3px solid #C8102E', paddingLeft: 12, margin: '0 0 32px' }}>
            HOCKEY CULTURE
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            {/* History */}
            <div style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 8, padding: '28px 24px' }}>
              <h3 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.4rem', letterSpacing: '0.05em', color: '#C8102E', margin: '0 0 16px' }}>
                A NATION BORN ON ICE
              </h3>
              <p style={{ color: '#ccc', lineHeight: 1.7, fontSize: '0.9rem', margin: '0 0 12px' }}>
                Hockey&apos;s roots in Canada trace to the frozen harbours and rivers of Nova Scotia and Quebec in the early 1800s. By 1908, Montreal was chosen as the founding city of the International Ice Hockey Federation (IIHF).
              </p>
              <p style={{ color: '#ccc', lineHeight: 1.7, fontSize: '0.9rem', margin: '0 0 12px' }}>
                In 1917, the National Hockey League was founded in Montreal  --  originally with seven teams  --  cementing Canada as the spiritual home of professional hockey. The CHL (Canadian Hockey League) system would follow, producing generations of world-class talent.
              </p>
              <p style={{ color: '#ccc', lineHeight: 1.7, fontSize: '0.9rem', margin: 0 }}>
                From minor hockey ponds to NHL arenas, Canada&apos;s national identity is inseparable from the sport. An estimated 1.3 million Canadians are registered players  --  the highest per-capita rate in the world.
              </p>
            </div>

            {/* Junior Pathway */}
            <div style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 8, padding: '28px 24px' }}>
              <h3 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.4rem', letterSpacing: '0.05em', color: '#C8102E', margin: '0 0 16px' }}>
                THE JUNIOR PATHWAY
              </h3>
              <p style={{ color: '#ccc', lineHeight: 1.7, fontSize: '0.9rem', margin: '0 0 12px' }}>
                Canada&apos;s major junior system is the world&apos;s most prolific NHL feeder system. Three leagues  --  the OHL (Ontario), WHL (Western), and QMJHL (Quebec)  --  operate under the CHL umbrella, featuring players aged 16-20.
              </p>
              <p style={{ color: '#ccc', lineHeight: 1.7, fontSize: '0.9rem', margin: '0 0 12px' }}>
                <strong style={{ color: '#fff' }}>Major Junior</strong> is a full-time commitment  --  players live with billet families, attend school, and train/play 60+ games per season. It is widely regarded as the fastest development path to pro hockey.
              </p>
              <p style={{ color: '#ccc', lineHeight: 1.7, fontSize: '0.9rem', margin: '0 0 12px' }}>
                From major junior, elite prospects advance to the AHL (development league), then to the NHL. Canadian-born players have won more Hart Trophies (MVP) than any other nationality.
              </p>
              <p style={{ color: '#ccc', lineHeight: 1.7, fontSize: '0.9rem', margin: 0 }}>
                Beyond major junior, Canada&apos;s NCAA (US colleges), CJHL (Junior A), and Tier II junior systems ensure no pathway is missed for talented young players.
              </p>
            </div>
          </div>
        </div>

        {/* Leagues */}
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 64px' }}>
          <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '2rem', letterSpacing: '0.05em', borderLeft: '3px solid #C8102E', paddingLeft: 12, margin: '0 0 32px' }}>
            LEAGUES IN CANADA
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {CANADIAN_LEAGUES.map((league) => (
              <div key={league.slug} style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 8, padding: '20px' }}>
                <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.6rem', letterSpacing: '0.05em', color: '#fff', marginBottom: 8 }}>
                  {league.name}
                </div>
                <p style={{ color: '#999', fontSize: '0.85rem', lineHeight: 1.5, margin: 0 }}>
                  {league.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* NHL Players from Canada */}
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 64px' }}>
          <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '2rem', letterSpacing: '0.05em', borderLeft: '3px solid #C8102E', paddingLeft: 12, margin: '0 0 32px' }}>
            NHL PLAYERS FROM CANADA
          </h2>
          <div style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: '#1a1a1a' }}>
                  <th style={{ textAlign: 'left', padding: '12px 16px', color: '#888', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid #222' }}>Player</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', color: '#888', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid #222' }}>NHL Team</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', color: '#888', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid #222' }}>Position</th>
                </tr>
              </thead>
              <tbody>
                {CANADIAN_NHL_PLAYERS.map((player, i) => (
                  <tr key={player.name} style={{ borderBottom: i < CANADIAN_NHL_PLAYERS.length - 1 ? '1px solid #1a1a1a' : 'none' }}>
                    <td style={{ padding: '12px 16px', color: '#fff' }}>{player.name}</td>
                    <td style={{ padding: '12px 16px', color: '#C8102E' }}>{player.team}</td>
                    <td style={{ padding: '12px 16px', color: '#999' }}>{player.position}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Canadian Rinks */}
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 64px' }}>
          <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '2rem', letterSpacing: '0.05em', borderLeft: '3px solid #C8102E', paddingLeft: 12, margin: '0 0 32px' }}>
            CANADIAN RINKS
          </h2>
          {canadianRinks.data && canadianRinks.data.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {canadianRinks.data.map((rink) => (
                <div key={rink.name} style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 8, padding: '20px' }}>
                  <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.2rem', letterSpacing: '0.05em', color: '#fff', marginBottom: 6 }}>
                    {rink.name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#999' }}>
                    {rink.city}
                    {rink.rink_type ? ` · ${rink.rink_type}` : ''}
                    {rink.capacity ? ` · ${rink.capacity.toLocaleString()} capacity` : ''}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#666', fontSize: '0.9rem' }}>No rinks found in database for Canada.</p>
          )}
        </div>
      </div>
    </>
  );
}
