import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Junior Hockey | RinkStop',
  description: 'Coverage of junior hockey leagues worldwide — OHL, WHL, QMJHL, USHL, and more. The top junior hockey competitions and NHL draft pipelines.',
};

export default function JuniorPage() {
  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/" style={{ color: '#555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory" style={{ color: '#555' }}>Directory</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Junior Hockey</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1 }}>
          JUNIOR HOCKEY
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          Top junior leagues — the world&apos;s best young talent and NHL draft pipeline.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          {
            name: 'Ontario Hockey League',
            abbr: 'OHL',
            color: '#1E3A8A',
            desc: 'Top junior hockey in Ontario, Canada. 20 teams. Premier path to NHL.',
            href: '/directory/junior/ohl',
            age: '16-20',
            established: '1980',
          },
          {
            name: 'Western Hockey League',
            abbr: 'WHL',
            color: '#C8102E',
            desc: 'Western Canada and US Pacific Northwest. 22 teams. Major CHL league.',
            href: '/directory/junior/whl',
            age: '16-20',
            established: '1966',
          },
          {
            name: 'QMJHL',
            abbr: 'Quebec Maritimes Jr.',
            color: '#1E5B9C',
            desc: 'Quebec, Maritimes, and eastern Canada. 18 teams. French-language hub.',
            href: '/directory/junior/qmjhl',
            age: '16-20',
            established: '1969',
          },
          {
            name: 'USHL',
            abbr: 'United States Hockey League',
            color: '#041E42',
            desc: 'Top junior league in the US. 17 teams. Premier development path for American players.',
            href: '/directory/junior/ushl',
            age: '16-20',
            established: '1972',
          },
        ].map(l => (
          <Link key={l.abbr} href={l.href} style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'var(--s2)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '1.5rem',
              transition: 'border-color 0.2s',
            }}>
              <span style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: l.color }}>{l.abbr}</span>
              <h3 className="font-sport" style={{ fontSize: '1.25rem', color: '#fff', letterSpacing: '0.04em', marginTop: '0.25rem' }}>{l.name}</h3>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8125rem', marginTop: '0.5rem', lineHeight: 1.6 }}>{l.desc}</p>
              <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.3)' }}>Age: {l.age}</span>
                <span style={{ fontSize: '0.6875rem', color: l.color, fontWeight: 600 }}>Explore →</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.25rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>ABOUT JUNIOR HOCKEY</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', lineHeight: 1.8, marginBottom: '1rem' }}>
          Junior hockey is the primary development pathway for North American hockey players aiming for NCAA college hockey and the NHL. Major Junior leagues (OHL, WHL, QMJHL) offer elite competition for players ages 16–20, often as an alternative to college hockey. The USHL is the top junior league in the United States, serving as a pipeline for NCAA Division I players and future professionals.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link href="/directory/college" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600 }}>College Hockey →</Link>
          <Link href="/directory/leagues" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600 }}>All Leagues →</Link>
        </div>
      </div>
    </main>
  );
}