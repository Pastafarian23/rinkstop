import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Pro Hockey Leagues | RinkStop',
  description: 'Explore professional hockey leagues worldwide  --  NHL, PWHL, KHL, AHL, and more. The top professional hockey competitions from around the globe.',
};

const PRO_LEAGUES = [
  {
    name: 'National Hockey League',
    abbr: 'NHL',
    href: '/directory/nhl',
    color: '#041E42',
    country: '🇺🇸🇨🇦',
    level: 'Tier 1',
    desc: 'The world\'s premier professional hockey league. 32 teams across the US and Canada.',
    established: '1917',
  },
  {
    name: 'Professional Women\'s Hockey League',
    abbr: 'PWHL',
    href: '/directory/pwhl',
    color: '#4ECDC4',
    country: '🇺🇸🇨🇦',
    level: 'Tier 1',
    desc: 'Six-team professional women\'s league featuring the world\'s best female hockey players.',
    established: '2024',
  },
  {
    name: 'Kontinental Hockey League',
    abbr: 'KHL',
    href: '/directory/khl',
    color: '#1E5B9C',
    country: '🇷🇺🌍',
    level: 'Tier 1',
    desc: 'Top-tier Russian and international league. 23 teams across Russia, Belarus, Kazakhstan, and China.',
    established: '2008',
  },
  {
    name: 'American Hockey League',
    abbr: 'AHL',
    href: '/directory/ahl',
    color: '#C8102E',
    country: '🇺🇸🇨🇦',
    level: 'Tier 2',
    desc: 'Primary developmental league for the NHL. 32 teams across North America.',
    established: '1936',
  },
];

export default function ProLeaguesPage() {
  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/" style={{ color: '#555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory" style={{ color: '#555' }}>Directory</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Professional Leagues</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1 }}>
          PROFESSIONAL HOCKEY LEAGUES
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          The world&apos;s top professional hockey competitions.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
        {PRO_LEAGUES.map(l => (
          <Link key={l.abbr} href={l.href} style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'var(--s2)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '1.5rem',
              transition: 'border-color 0.2s, transform 0.2s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: l.color }}>{l.level}</span>
                <span style={{ fontSize: '1.25rem' }}>{l.country}</span>
              </div>
              <h3 className="font-sport" style={{ fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em' }}>{l.abbr}</h3>
              <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: '0.75rem' }}>{l.name}</p>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8125rem', lineHeight: 1.6 }}>{l.desc}</p>
              <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.3)' }}>Est. {l.established}</span>
                <span style={{ fontSize: '0.6875rem', color: l.color, fontWeight: 600 }}>Explore →</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}