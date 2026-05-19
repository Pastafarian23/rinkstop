import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'NHL Pacific Division | RinkStop',
  description: 'NHL Pacific Division — Anaheim, Calgary, Edmonton, LA, San Jose, Seattle, Vancouver, Vegas.',
};

const PACIFIC_TEAMS = [
  { name: 'Anaheim Ducks',        id: '219a6bb2-1103-4e27-931e-5de440e59f84', abbr: 'ANA', city: 'Anaheim'     },
  { name: 'Calgary Flames',       id: '626458da-d2d4-4a4f-816b-f3796b84cfc4', abbr: 'CGY', city: 'Calgary'     },
  { name: 'Edmonton Oilers',       id: '5b487d74-5e9c-43c8-b104-35185fc93350', abbr: 'EDM', city: 'Edmonton'    },
  { name: 'Los Angeles Kings',    id: 'df9b5d1e-c5d9-46af-a524-99de500e95bf', abbr: 'LAK', city: 'Los Angeles' },
  { name: 'San Jose Sharks',      id: '16c9d078-ecc9-4e7c-8bf3-e1b6e9a6ae10', abbr: 'SJS', city: 'San Jose'   },
  { name: 'Seattle Kraken',       id: 'bf324536-424b-4a3d-b486-1347aa735aae', abbr: 'SEA', city: 'Seattle'    },
  { name: 'Vancouver Canucks',    id: 'dc828fd7-65ae-4c1d-92ea-66975eb38fce', abbr: 'VAN', city: 'Vancouver'  },
  { name: 'Vegas Golden Knights', id: 'cf05f5b0-6605-465f-86f3-a6f1710afc20', abbr: 'VGK', city: 'Las Vegas'  },
];

function getLogoUrl(abbr: string) {
  return `https://assets.nhle.com/logos/nhl/svg/${abbr}_light.svg`;
}

export default function PacificPage() {
  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory">Directory</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory/nhl">NHL</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Pacific Division</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1 }}>
          NHL PACIFIC DIVISION
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          8 teams • Western Conference
        </p>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
        {[
          { label: 'All NHL', href: '/directory/nhl' },
          { label: 'Central', href: '/directory/nhl/central' },
          { label: 'Eastern Conf.', href: '/directory/nhl/eastern' },
          { label: 'Playoffs', href: '/directory/nhl/playoffs' },
        ].map(n => (
          <Link key={n.href} href={n.href} style={{
            padding: '0.3rem 0.75rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
            textDecoration: 'none', color: 'rgba(255,255,255,0.55)', background: 'var(--s2)',
            border: '1px solid var(--border)',
          }}>{n.label}</Link>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.625rem' }}>
        {PACIFIC_TEAMS.map(t => (
          <Link key={t.id} href={`/directory/teams/${t.id}`} style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            background: 'var(--s2)', border: '1px solid var(--border)',
            borderRadius: '6px', padding: '0.875rem 1rem', textDecoration: 'none',
          }}>
            <img
              src={getLogoUrl(t.abbr)}
              alt=""
              style={{ width: 36, height: 36, objectFit: 'contain', flexShrink: 0 }}
              
            />
            <div>
              <p style={{ fontWeight: 700, fontSize: '0.875rem', color: '#fff' }}>{t.name}</p>
              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>{t.city}</p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}