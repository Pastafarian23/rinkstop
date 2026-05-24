import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
);

export const metadata: Metadata = {
  title: 'Hockey in Finland | RinkStop',
  description: 'The land of a thousand lakes produces disproportionate NHL talent. Liiga, Mestis, and a development system built on skill and ice time.',
  alternates: { canonical: 'https://rinkstop.com/directory/finland' },
  openGraph: { title: 'Hockey in Finland | RinkStop', description: 'Per-capita NHL powerhouse. Liiga, Mestis, and world-class development.', type: 'article' },
};

const finnishNhlPlayers = [
  { name: 'Aleksander Barkov', team: 'Florida Panthers', position: 'C', retired: false },
  { name: 'Mikko Rantanen', team: 'Colorado Avalanche', position: 'RW', retired: false },
  { name: 'Sebastian Aho', team: 'Carolina Hurricanes', position: 'C', retired: false },
  { name: 'Roope Hintz', team: 'Dallas Stars', position: 'C', retired: false },
  { name: 'Tuukka Rask', team: 'Boston Bruins', position: 'G', retired: true },
  { name: 'Pekka Rinne', team: 'Nashville Predators', position: 'G', retired: true },
  { name: 'Artturi Lehkonen', team: 'Vancouver Canucks', position: 'LW', retired: false },
  { name: 'Kasperi Kapanen', team: 'Pittsburgh Penguins', position: 'RW', retired: false },
  { name: 'Erik Haula', team: 'New Jersey Devils', position: 'C/LW', retired: false },
  { name: 'Mikael Granlund', team: 'Toronto Maple Leafs', position: 'C/RW', retired: false },
];

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How many Finns play in the NHL?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Finland consistently has 40–60 players in the NHL at any given time — remarkable for a country of only 5.5 million people. Per capita, Finland produces more NHL talent than any country outside of Canada and the US.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is Liiga?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Liiga (formerly SM-liiga) is Finland's top professional hockey league, featuring 15 teams. It is widely regarded as one of the best non-North American leagues in the world and serves as the primary development path for Finnish NHL players.",
      },
    },
    {
      '@type': 'Question',
      name: 'Why is Finland so good at hockey?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Finland combines early ice access for children (many rinks are indoors and available year-round), a culture that treats hockey as both sport and social institution, and a dense development system that exposes players to high-quality competition from a young age.',
      },
    },
  ],
};

export default async function FinlandPage() {
  const { data: leagues } = await supabase
    .from('leagues')
    .select('name, slug, country, sport')
    .or('country.ilike.%inland%,slug.ilike.%liiga%,slug.ilike.%mestis%')
    .limit(20);

  const { data: rinks } = await supabase
    .from('rinks')
    .select('id, name, city, rink_type, capacity, country')
    .ilike('country', '%inland%')
    .eq('is_active', true)
    .limit(20);

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0.75rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link><span style={{ margin: '0 0.4rem' }}>/</span>
        <Link href="/directory">Directory</Link><span style={{ margin: '0 0.4rem' }}>/</span>
        <span style={{ color: '#A0A0A0' }}>Finland</span>
      </nav>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#fff', letterSpacing: '0.04em', lineHeight: 1, margin: '0 0 0.75rem' }}>HOCKEY IN FINLAND</h1>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
        The land of a thousand lakes produces more NHL talent per capita than almost any country on Earth. Liiga drives the game forward.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '2.5rem' }}>
        {[
          { label: 'IIHF World Ranking', value: '#3-5', sub: 'Consistently top-5 globally' },
          { label: 'NHL Players', value: '~50', sub: 'Finnish nationals in the NHL' },
          { label: 'Liiga Teams', value: '15', sub: 'Top-tier Finnish clubs' },
          { label: 'First NHL Player', value: '1927', sub: 'Knut Vatto, New York Rangers' },
        ].map(s => (
          <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '1.125rem 1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', marginBottom: '0.125rem' }}>{s.value}</div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {leagues && leagues.length > 0 && (
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>LEAGUES IN FINLAND</h2>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {leagues.map(l => (
              <Link key={l.slug} href={`/directory/leagues/${l.slug}`} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '1rem', color: '#fff', textDecoration: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600 }}>{l.name}</span>
                <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.4)' }}>{l.sport}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {rinks && rinks.length > 0 && (
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>RINKS IN FINLAND</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
            {rinks.map(r => (
              <Link key={r.id} href={`/directory/rinks/${r.id}`} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '1rem', color: '#fff', textDecoration: 'none' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: '0.25rem' }}>{r.name}</div>
                <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.4)' }}>{r.city}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>NOTABLE FINNISH NHL PLAYERS</h2>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {finnishNhlPlayers.map(p => (
            <div key={p.name} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontWeight: 600, color: '#fff' }}>{p.name}</span>
                <span style={{ color: 'rgba(255,255,255,0.4)', marginLeft: '0.5rem', fontSize: '0.875rem' }}>{p.position}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>{p.team}</span>
                {p.retired && <span style={{ marginLeft: '0.5rem', background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', fontSize: '0.6875rem', padding: '0.125rem 0.5rem', borderRadius: '4px' }}>RETIRED</span>}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}