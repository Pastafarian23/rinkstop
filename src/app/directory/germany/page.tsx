import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const metadata: Metadata = {
  title: 'Hockey in Germany | RinkStop',
  description: 'Germany is a top-tier hockey nation with a growing NHL presence. DEL, DEL2, and a passionate fan culture driving European hockey forward.',
  alternates: { canonical: 'https://rinkstop.com/directory/germany' },
  openGraph: { title: 'Hockey in Germany | RinkStop', description: 'Top-tier European hockey. DEL, DEL2, growing NHL pipeline.', type: 'article' },
};

export default async function GermanyPage() {
  const { data: germanRinks } = await supabase
    .from('rinks').select('id, name, city, rink_type, capacity')
    .or('country.ilike.%Germany%,country.ilike.%DE%')
    .eq('is_active', true).limit(20);

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0.75rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link><span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory" style={{ color: '#555' }}>Directory</Link><span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Germany</span>
      </nav>


      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#fff', letterSpacing: '0.04em', lineHeight: 1, margin: '0 0 0.75rem' }}>HOCKEY IN GERMANY</h1>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>A top-tier European hockey nation with a rich tradition. The DEL drives the game forward, and German players are making their mark in the NHL more than ever.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '2.5rem' }}>
        {[
          { label: 'IIHF World Ranking', value: '#5-8', sub: 'Consistently top-10 since 2010' },
          { label: 'NHL Players', value: '~20', sub: 'German nationals currently in NHL' },
          { label: 'DEL Teams', value: '15', sub: 'Across Germany\'s top flight' },
          { label: 'Olympic Medal', value: '2018 Silver', sub: 'PyeongChang stunner vs Canada' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.125rem 1.25rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C8102E', marginBottom: '0.375rem' }}>{s.label}</p>
            <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', color: '#fff', letterSpacing: '0.04em', lineHeight: 1 }}>{s.value}</p>
            <p style={{ fontSize: '0.6875rem', color: '#555', marginTop: '0.25rem' }}>{s.sub}</p>
          </div>
        ))}
      </div>

      <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', borderLeft: '3px solid #C8102E', paddingLeft: '12px', marginBottom: '1rem' }}>HOCKEY CULTURE</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2.5rem' }}>
        <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '1.25rem 1.5rem' }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#C8102E', marginBottom: '0.5rem' }}>The DEL Era</h3>
          <p style={{ fontSize: '0.8125rem', color: '#888', lineHeight: 1.75 }}>The Deutsche Eishockey Liga was founded in 1994 as Germany moved from its state-run Eishockey Bundesliga toward a modern, market-driven league. Today the DEL attracts 7,000-17,000 fans per game depending on the city. German teams like Eisbaren Berlin, Adler Mannheim, and Red Bull Munich dominate domestic play and compete in European club tournaments.</p>
        </div>
        <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '1.25rem 1.5rem' }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#C8102E', marginBottom: '0.5rem' }}>The NHL Breakthrough</h3>
          <p style={{ fontSize: '0.8125rem', color: '#888', lineHeight: 1.75 }}>For decades, Germany produced competent NHL players but few stars. That changed with Leon Draisaitl (3rd overall pick 2014) and Tim Stutzle (3rd overall pick 2020). The 2018 Olympic silver medal  --  a team featuring Draisaitl, Grubauer, and Yandle? No  --  was a watershed moment that inspired a generation of German youth hockey players.</p>
        </div>
      </div>

      <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', borderLeft: '3px solid #C8102E', paddingLeft: '12px', marginBottom: '1rem' }}>LEAGUES IN GERMANY</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '2.5rem' }}>
        {[
          { name: 'DEL', tier: 'Tier 1', note: 'Deutsche Eishockey Liga  --  15 teams, Germany\'s premier professional league, founded 1994.' },
          { name: 'DEL2', tier: 'Tier 2', note: 'Second division  --  14 teams, serves as the main developmental league below the DEL.' },
          { name: 'Oberliga', tier: 'Tier 3', note: 'Oberliga  --  regional play across Germany with champions qualifying for DEL2 playoffs.' },
          { name: 'German Cup', tier: 'Domestic Cup', note: 'DEB Pokal  --  annual knockout competition open to all German professional and amateur teams.' },
        ].map(l => (
          <div key={l.name} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem 1.25rem' }}>
            <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>{l.name}</p>
            <p style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C8102E', marginBottom: '0.375rem' }}>{l.tier}</p>
            <p style={{ fontSize: '0.75rem', color: '#666', lineHeight: 1.55 }}>{l.note}</p>
          </div>
        ))}
      </div>

      <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', borderLeft: '3px solid #C8102E', paddingLeft: '12px', marginBottom: '1rem' }}>NHL STARS FROM GERMANY</h2>
      <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.5rem 0', marginBottom: '2.5rem', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 100px', gap: '0.75rem', padding: '0.75rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555' }}>Player</p>
          <p style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555' }}>Team</p>
          <p style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555' }}>Position</p>
        </div>
        {[
          { name: 'Leon Draisaitl', team: 'Edmonton Oilers', pos: 'Center' },
          { name: 'Tim Stutzle', team: 'Ottawa Senators', pos: 'Wing' },
          { name: 'Philipp Grubauer', team: 'New York Islanders', pos: 'Goalie' },
          { name: 'John-Jason Peterka', team: 'Buffalo Sabres', pos: 'Wing' },
          { name: 'Nico Sturm', team: 'San Jose Sharks', pos: 'Center' },
          { name: 'Lukas Reichel', team: 'Chicago Blackhawks', pos: 'Wing' },
          { name: 'JJ Peterka', team: 'Buffalo Sabres', pos: 'Wing' },
          { name: 'Egon Molteni', team: 'New York Rangers', pos: 'Wing' },
          { name: 'Marcel Noebels', team: 'Philadelphia Flyers', pos: 'Wing' },
          { name: 'Leon Gawanke', team: 'Winnipeg Jets', pos: 'Defense' },
        ].map(p => (
          <div key={p.name} style={{ display: 'grid', gridTemplateColumns: '1fr 140px 100px', gap: '0.75rem', padding: '0.75rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff' }}>{p.name}</p>
            <p style={{ fontSize: '0.8125rem', color: '#888' }}>{p.team}</p>
            <p style={{ fontSize: '0.8125rem', color: '#666' }}>{p.pos}</p>
          </div>
        ))}
      </div>

      <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', borderLeft: '3px solid #C8102E', paddingLeft: '12px', marginBottom: '1rem' }}>GERMAN RINKS</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.75rem', marginBottom: '2rem' }}>
        {(germanRinks ?? []).length === 0 ? (
          <p style={{ color: '#555', fontSize: '0.875rem', gridColumn: '1 / -1' }}>No rinks registered yet. <Link href="/add-rink" style={{ color: '#C8102E' }}>Add one →</Link></p>
        ) : (germanRinks ?? []).map(r => (
          <div key={r.id} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem 1.25rem' }}>
            <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', marginBottom: '0.375rem' }}>{r.name}</p>
            <p style={{ fontSize: '0.75rem', color: '#666' }}>{r.city}{r.capacity ? ` · ${r.capacity.toLocaleString()} seats` : ''}</p>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem', textAlign: 'center' }}>
        <p style={{ color: '#666', fontSize: '0.875rem', marginBottom: '0.75rem' }}>Browse all international hockey</p>
        <Link href="/directory/international" style={{ padding: '0.625rem 1.25rem', background: '#C8102E', borderRadius: '6px', color: '#fff', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none' }}>International Hockey →</Link>
      </div>
    </div>
  );
}