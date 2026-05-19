import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'NHL Hub | RinkStop',
  description: 'The complete NHL hub on RinkStop — team directory, latest scores, standings, stats, and news for all 32 NHL teams.',
};

export default function NHLHubPage() {
  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/" style={{ color: '#555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory" style={{ color: '#555' }}>Directory</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>NHL</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1 }}>
          NHL HUB
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          32 teams across North America. The world&apos;s premier hockey league.
        </p>
      </div>

      {/* Quick nav */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
        {[
          { label: 'All Teams', href: '/directory/teams' },
          { label: 'NHL Playoffs', href: '/directory/nhl/playoffs' },
          { label: 'AHL', href: '/directory/ahl' },
          { label: 'Pro Leagues', href: '/directory/pro-leagues' },
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

      {/* NHL Conferences */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          {
            name: 'Eastern Conference',
            abbr: 'EAST',
            color: '#041E42',
            desc: 'Atlantic and Metropolitan divisions. 16 teams.',
            href: '/directory/nhl/eastern',
          },
          {
            name: 'Western Conference',
            abbr: 'WEST',
            color: '#C8102E',
            desc: 'Central and Pacific divisions. 16 teams.',
            href: '/directory/nhl/western',
          },
        ].map(d => (
          <Link key={d.name} href={d.href} style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'var(--s2)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '1.5rem',
              transition: 'border-color 0.2s',
            }}>
              <span style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: d.color }}>{d.abbr}</span>
              <h3 className="font-sport" style={{ fontSize: '1.25rem', color: '#fff', letterSpacing: '0.04em', marginTop: '0.25rem' }}>{d.name}</h3>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8125rem', marginTop: '0.5rem', lineHeight: 1.6 }}>{d.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* NHL Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '2rem' }}>
        {[
          { label: 'Teams', value: '32' },
          { label: 'Divisions', value: '4' },
          { label: 'Conferences', value: '2' },
          { label: 'Founded', value: '1917' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '1rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: '0.25rem' }}>{s.label}</p>
            <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* NHL Divisions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
        {[
          { name: 'Atlantic', abbr: 'ATL', color: '#041E42', href: '/directory/nhl/atlantic', teams: 'Boston, Buffalo, Detroit, Florida, Montreal, Ottawa, Toronto, Tampa Bay', conference: 'Eastern' },
          { name: 'Metropolitan', abbr: 'MET', color: '#1E3A5F', href: '/directory/nhl/metropolitan', teams: 'Carolina, Columbus, New Jersey, NY Islanders, NY Rangers, Philadelphia, Pittsburgh, Washington', conference: 'Eastern' },
          { name: 'Central', abbr: 'CEN', color: '#C8102E', href: '/directory/nhl/central', teams: 'Colorado, Dallas, Minnesota, Nashville, St. Louis, Utah, Winnipeg', conference: 'Western' },
          { name: 'Pacific', abbr: 'PAC', color: '#1E5B9C', href: '/directory/nhl/pacific', teams: 'Anaheim, Calgary, Edmonton, LA Kings, San Jose, Seattle, Vancouver, Vegas', conference: 'Western' },
        ].map(d => (
          <Link key={d.name} href={d.href} style={{ textDecoration: 'none' }}>
            <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: d.color }}>{d.abbr} • {d.conference}</span>
              </div>
              <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.25rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>{d.name} Division</h3>
              <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>{d.teams}</p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}