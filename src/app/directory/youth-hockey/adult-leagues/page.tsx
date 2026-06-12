import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Adult Hockey Leagues',
  description: 'Find adult hockey leagues near you  --  from recreational beer leagues to competitive divisions. Playing hockey as an adult has never been more popular.',
};

export default function AdultLeaguesPage() {
  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory">Directory</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Adult Leagues</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1 }}>
          ADULT HOCKEY LEAGUES
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          From first-time adults to ex-college players. Hockey has a place for everyone who wants to play.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
        {[
          { label: 'Learn to Play', href: '/directory/youth-hockey/learn-to-play' },
          { label: 'Youth Hockey', href: '/directory/youth-hockey' },
          { label: 'Youth Tournaments', href: '/directory/youth-hockey/tournaments' },
          { label: 'Adult Tournaments', href: '/directory/youth-hockey/adult-tournaments' },
        ].map(n => (
          <Link key={n.href} href={n.href} style={{
            padding: '0.3rem 0.75rem',
            borderRadius: '4px',
            fontSize: '0.75rem',
            fontWeight: 600,
            textDecoration: 'none',
            color: 'rgba(255,255,255,0.55)',
            background: 'var(--s2)',
            border: '1px solid var(--border)',
          }}>
            {n.label}
          </Link>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { level: 'Recreational / D', desc: 'No experience required. Often called "beer league." Emphasis on fun, exercise, and social hockey. Typically weekly games.', color: 'var(--teal)' },
          { level: 'Intermediate / C', desc: 'Some playing experience  --  often youth or junior backgrounds. Faster pace, more structured play. Multiple skill tiers within C-level.', color: '#4A90D9' },
          { level: 'Advanced / B', desc: 'Former varsity or high-level club players. Competitive but still amateur. Local and regional league play.', color: 'var(--gold)' },
          { level: 'Elite / A', desc: 'Ex-college, former junior, or high-level amateur players. Very competitive. Some leagues have A-level as semi-pro feeder.', color: 'var(--red)' },
        ].map(l => (
          <div key={l.level} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.25rem' }}>
            <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.25rem', color: l.color, letterSpacing: '0.04em', marginBottom: '0.75rem' }}>{l.level}</h3>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.875rem', lineHeight: 1.7 }}>{l.desc}</p>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.25rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>GETTING STARTED AS AN ADULT</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
          {[
            { title: 'Find a League', text: 'Contact your nearest rink and ask about adult hockey leagues. Most rinks run multiple adult divisions.' },
            { title: 'Gear Up', text: 'Adult amateur leagues require full equipment. Helmet, cage, shoulder pads, elbow, gloves, pants, shin guards, skates, stick.' },
            { title: 'Watch First', text: 'Most leagues let you watch a game or two before committing. Ask the rink or league commissioner.' },
            { title: 'Join at Your Level', text: 'Be honest about your skill level  --  it keeps the game safe and fun for everyone in your division.' },
          ].map(t => (
            <div key={t.title}>
              <h3 style={{ fontWeight: 700, fontSize: '0.875rem', color: '#fff', marginBottom: '0.4rem' }}>{t.title}</h3>
              <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>{t.text}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
