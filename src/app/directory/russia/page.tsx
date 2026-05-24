import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
);

export const metadata: Metadata = {
  title: 'Hockey in Russia | RinkStop',
  description: "Russia is a hockey superpower. The KHL is the world's second-ranked league, producing NHL stars and international champions year after year.",
  alternates: { canonical: 'https://rinkstop.com/directory/russia' },
  openGraph: { title: 'Hockey in Russia | RinkStop', description: "Hockey superpower. KHL, MHL, and world-class player development.", type: 'article' },
};

export default async function RussiaPage() {
  const { data: russianRinks } = await supabase
    .from('rinks').select('id, name, city, rink_type, capacity')
    .or('country.ilike.%Russia%,country.ilike.%RU%')
    .eq('is_active', true).limit(20);

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0.75rem 1rem 4rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link><span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory" style={{ color: '#555' }}>Directory</Link><span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Russia</span>
      </nav>

      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#fff', letterSpacing: '0.04em', lineHeight: 1, margin: '0 0 0.75rem' }}>HOCKEY IN RUSSIA</h1>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>The KHL is the world's second-ranked league. Russia produces more skilled players outside North America than any other country.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '2.5rem' }}>
        {[
          { label: 'IIHF World Ranking', value: '#2-4', sub: 'Consistently top-4 globally' },
          { label: 'NHL Players', value: '~70', sub: 'Russian nationals in the NHL' },
          { label: 'KHL Teams', value: '22+', sub: 'Across Russia and Europe' },
          { label: 'Olympic Golds', value: '3', sub: '1992, 2006, 2018' },
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
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#C8102E', marginBottom: '0.5rem' }}>The Soviet Dynasty</h3>
          <p style={{ fontSize: '0.8125rem', color: '#888', lineHeight: 1.75 }}>Soviet hockey dominated international play from the 1950s through the 1980s, winning 7 Olympic golds and 22 World Championship golds. The famous "Red Line" series of the 1970s  --  when the Soviet national team toured Canada  --  changed how North America viewed European hockey technique.</p>
        </div>
        <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '1.25rem 1.5rem' }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#C8102E', marginBottom: '0.5rem' }}>The KHL Era</h3>
          <p style={{ fontSize: '0.8125rem', color: '#888', lineHeight: 1.75 }}>The KHL was founded in 2008 as a direct competitor to the NHL. It brought together Russia's top clubs with teams from Belarus, Kazakhstan, Latvia, and Finland. The league's ambition: to become the world's top hockey league outside North America. Top KHL players routinely transition to NHL deals worth $8M+ per year.</p>
        </div>
      </div>

      <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', borderLeft: '3px solid #C8102E', paddingLeft: '12px', marginBottom: '1rem' }}>LEAGUES IN RUSSIA</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '2.5rem' }}>
        {[
          { name: 'KHL', tier: 'Professional', note: 'Kontinental Hockey League  --  22 teams, Gagarin Cup champion, widely ranked #2 globally after NHL.' },
          { name: 'MHL', tier: 'Junior', note: 'Moscow Hockey League  --  premier Russian junior league for players 17-21. The KHL\'s main feeder.' },
          { name: 'VHL', tier: 'Second Tier', note: 'Supreme Hockey League  --  second-tier professional hockey in Russia, serving as a bridge between MHL and KHL.' },
          { name: 'Russian Cup', tier: 'Domestic Cup', note: 'Open Russian Cup tournament run annually since 1992, contested by KHL, VHL, and MHL clubs.' },
        ].map(l => (
          <div key={l.name} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem 1.25rem' }}>
            <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>{l.name}</p>
            <p style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C8102E', marginBottom: '0.375rem' }}>{l.tier}</p>
            <p style={{ fontSize: '0.75rem', color: '#666', lineHeight: 1.55 }}>{l.note}</p>
          </div>
        ))}
      </div>

      <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', borderLeft: '3px solid #C8102E', paddingLeft: '12px', marginBottom: '1rem' }}>NHL STARS FROM RUSSIA</h2>
      <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.5rem 0', marginBottom: '2.5rem', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 100px', gap: '0.75rem', padding: '0.75rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555' }}>Player</p>
          <p style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555' }}>Team</p>
          <p style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555' }}>Position</p>
        </div>
        {[
          { name: 'Nikita Kucherov', team: 'Tampa Bay Lightning', pos: 'Wing' },
          { name: 'Artemi Panarin', team: 'New York Rangers', pos: 'Wing' },
          { name: 'Kirill Kaprizov', team: 'Minnesota Wild', pos: 'Wing' },
          { name: 'Ilya Sorokin', team: 'New York Islanders', pos: 'Goalie' },
          { name: 'Andrei Vasilevskiy', team: 'Tampa Bay Lightning', pos: 'Goalie' },
          { name: 'Nikita Zadorov', team: 'Boston Bruins', pos: 'Defense' },
          { name: 'Ivan Provorov', team: 'Seattle Kraken', pos: 'Defense' },
          { name: 'Mikhail Sergachev', team: 'Tampa Bay Lightning', pos: 'Defense' },
          { name: 'Pavel Zacha', team: 'Boston Bruins', pos: 'Center' },
          { name: 'Dmitry Orlov', team: 'Winnipeg Jets', pos: 'Defense' },
        ].map(p => (
          <div key={p.name} style={{ display: 'grid', gridTemplateColumns: '1fr 140px 100px', gap: '0.75rem', padding: '0.75rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff' }}>{p.name}</p>
            <p style={{ fontSize: '0.8125rem', color: '#888' }}>{p.team}</p>
            <p style={{ fontSize: '0.8125rem', color: '#666' }}>{p.pos}</p>
          </div>
        ))}
      </div>

      <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', borderLeft: '3px solid #C8102E', paddingLeft: '12px', marginBottom: '1rem' }}>RUSSIAN RINKS</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.75rem', marginBottom: '2rem' }}>
        {(russianRinks ?? []).length === 0 ? (
          <p style={{ color: '#555', fontSize: '0.875rem', gridColumn: '1 / -1' }}>No rinks registered yet. <Link href="/add-rink" style={{ color: '#C8102E' }}>Add one →</Link></p>
        ) : (russianRinks ?? []).map(r => (
          <div key={r.id} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem 1.25rem' }}>
            <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', marginBottom: '0.375rem' }}>{r.name}</p>
            <p style={{ fontSize: '0.75rem', color: '#666' }}>{r.city}{r.capacity ? ` · ${r.capacity.toLocaleString()} seats` : ''}</p>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem', textAlign: 'center' }}>
        <p style={{ color: '#666', fontSize: '0.875rem', marginBottom: '0.75rem' }}>Explore international hockey</p>
        <Link href="/directory/international" style={{ padding: '0.625rem 1.25rem', background: '#C8102E', borderRadius: '6px', color: '#fff', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none' }}>International Hockey →</Link>
      </div>
    </div>
  );
}