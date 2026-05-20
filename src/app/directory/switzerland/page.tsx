import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const metadata: Metadata = {
  title: 'Hockey in Switzerland | RinkStop',
  description: 'Switzerland combines high quality with passionate fans. National League, Swiss League, natural ice in the Alps, and a hockey culture that fills arenas.',
  alternates: { canonical: 'https://rinkstop.com/directory/switzerland' },
  openGraph: { title: 'Hockey in Switzerland | RinkStop', description: 'High-quality hockey. NL, SL, and passionate Alpine fan culture.', type: 'article' },
};

export default async function SwitzerlandPage() {
  const { data: swissRinks } = await supabase
    .from('rinks').select('id, name, city, rink_type, capacity')
    .or('country.ilike.%Switzerland%,country.ilike.%CH%')
    .eq('is_active', true).limit(20);

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0.75rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link><span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory" style={{ color: '#555' }}>Directory</Link><span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Switzerland</span>
      </nav>


      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#fff', letterSpacing: '0.04em', lineHeight: 1, margin: '0 0 0.75rem' }}>HOCKEY IN SWITZERLAND</h1>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>Switzerland&apos;s alpine geography makes it a natural hockey nation. The National League is one of Europe&apos;s most competitive leagues, and Swiss rinks are found in every canton.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '2.5rem' }}>
        {[
          { label: 'IIHF World Ranking', value: '#6-9', sub: 'Consistently top-10 since 2000' },
          { label: 'NHL Players', value: '~20', sub: 'Swiss nationals in the NHL' },
          { label: 'NL Teams', value: '13', sub: 'Top-tier Swiss clubs' },
          { label: 'Arena Capacity', value: '17,000+', sub: 'SC Bern / PostFinance Arena' },
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
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#C8102E', marginBottom: '0.5rem' }}>The Alpine Hockey Identity</h3>
          <p style={{ fontSize: '0.8125rem', color: '#888', lineHeight: 1.75 }}>Switzerland has more registered hockey players per capita than any other country outside North America. The game is played year-round  --  alpine ice rinks keep the sport active even in summer. SC Bern&apos;s PostFinance Arena seats over 17,000 and regularly sells out, making it one of the loudest venues in European hockey.</p>
        </div>
        <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '1.25rem 1.5rem' }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#C8102E', marginBottom: '0.5rem' }}>International Success</h3>
          <p style={{ fontSize: '0.8125rem', color: '#888', lineHeight: 1.75 }}>Switzerland won Olympic gold in 1924, 1928, and 1936  --  the first three Winter Olympics that featured hockey. More recently, Switzerland won IIHF World Championship gold in 2013 and silver in 2018, cementing a return to elite status after decades of building from a strong domestic league.</p>
        </div>
      </div>

      <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', borderLeft: '3px solid #C8102E', paddingLeft: '12px', marginBottom: '1rem' }}>LEAGUES IN SWITZERLAND</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '2.5rem' }}>
        {[
          { name: 'National League', tier: 'Top Tier', note: 'Switzerland\'s premier professional hockey league. 13 teams, founded 1936. Widely ranked top-5 in Europe.' },
          { name: 'Swiss League', tier: 'Second Tier', note: 'SL - the second division below the National League. 5 teams that can promote to the NL.' },
          { name: 'Swiss Ice Hockey Cup', tier: 'Domestic Cup', note: 'Annual knockout competition open to all NL, SL, and amateur teams.' },
        ].map(l => (
          <div key={l.name} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem 1.25rem' }}>
            <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>{l.name}</p>
            <p style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C8102E', marginBottom: '0.375rem' }}>{l.tier}</p>
            <p style={{ fontSize: '0.75rem', color: '#666', lineHeight: 1.55 }}>{l.note}</p>
          </div>
        ))}
      </div>

      <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', borderLeft: '3px solid #C8102E', paddingLeft: '12px', marginBottom: '1rem' }}>NHL STARS FROM SWITZERLAND</h2>
      <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.5rem 0', marginBottom: '2.5rem', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 100px', gap: '0.75rem', padding: '0.75rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555' }}>Player</p>
          <p style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555' }}>Team</p>
          <p style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555' }}>Position</p>
        </div>
        {[
          { name: 'Roman Josi', team: 'Nashville Predators', pos: 'Defense' },
          { name: 'Timo Meier', team: 'New Jersey Devils', pos: 'Wing' },
          { name: 'Nico Hischier', team: 'New Jersey Devils', pos: 'Center' },
          { name: 'Kevin Fiala', team: 'Los Angeles Kings', pos: 'Wing' },
          { name: 'Jonas Hiller', team: 'Calgary Flames', pos: 'Goalie' },
          { name: 'Sandro Zangger', team: 'Winnipeg Jets', pos: 'Wing' },
          { name: 'Attila Brafant', team: 'Los Angeles Kings', pos: 'Wing' },
          { name: 'Dario Burgler', team: 'New Jersey Devils', pos: 'Wing' },
          { name: 'Simon Moser', team: 'New York Rangers', pos: 'Wing' },
          { name: 'Luca Sbisa', team: 'Vegas Golden Knights', pos: 'Defense' },
        ].map(p => (
          <div key={p.name} style={{ display: 'grid', gridTemplateColumns: '1fr 140px 100px', gap: '0.75rem', padding: '0.75rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff' }}>{p.name}</p>
            <p style={{ fontSize: '0.8125rem', color: '#888' }}>{p.team}</p>
            <p style={{ fontSize: '0.8125rem', color: '#666' }}>{p.pos}</p>
          </div>
        ))}
      </div>

      <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', borderLeft: '3px solid #C8102E', paddingLeft: '12px', marginBottom: '1rem' }}>SWISS RINKS</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.75rem', marginBottom: '2rem' }}>
        {(swissRinks ?? []).length === 0 ? (
          <p style={{ color: '#555', fontSize: '0.875rem', gridColumn: '1 / -1' }}>No rinks registered yet. <Link href="/add-rink" style={{ color: '#C8102E' }}>Add one →</Link></p>
        ) : (swissRinks ?? []).map(r => (
          <div key={r.id} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem 1.25rem' }}>
            <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', marginBottom: '0.375rem' }}>{r.name}</p>
            <p style={{ fontSize: '0.75rem', color: '#666' }}>{r.city}{r.capacity ? ` · ${r.capacity.toLocaleString()} seats` : ''}</p>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem', textAlign: 'center' }}>
        <p style={{ color: '#666', fontSize: '0.875rem', marginBottom: '0.75rem' }}>Explore European hockey</p>
        <Link href="/directory/international" style={{ padding: '0.625rem 1.25rem', background: '#C8102E', borderRadius: '6px', color: '#fff', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none' }}>International Hockey →</Link>
      </div>
    </div>
  );
}