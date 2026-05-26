import type { Metadata } from 'next';
import Link from 'next/link';
import TeamLogo from '@/components/TeamLogo';
import TicketmasterAd from '@/components/TicketmasterAd';

export const metadata: Metadata = {
  title: 'NHL Central Division | RinkStop',
  description: 'NHL Central Division  --  Colorado, Dallas, Minnesota, Nashville, St. Louis, Utah, Winnipeg.',
};

const CENTRAL_TEAMS = [
  { name: 'Colorado Avalanche',  id: 'f453fd29-12e4-4897-8f8a-ecf23d6a4122', abbr: 'COL', city: 'Denver'        },
  { name: 'Dallas Stars',        id: '4c61f05e-8d34-40be-b0a8-adf37e14435c', abbr: 'DAL', city: 'Dallas'        },
  { name: 'Minnesota Wild',      id: 'd3947cbf-8b3c-4c16-8ab6-b8f8d0f5a1fe', abbr: 'MIN', city: 'Saint Paul'    },
  { name: 'Nashville Predators', id: '2d3d8a64-c0d7-4b8e-a327-a1201cc92f72', abbr: 'NSH', city: 'Nashville'     },
  { name: 'St. Louis Blues',      id: '7efc04e6-6a75-4b1f-a0da-3966d6e7359c', abbr: 'STL', city: 'St. Louis'     },
  { name: 'Utah Hockey Club',    id: '3b80d876-f931-4740-a47f-0ed15c0e410f', abbr: 'UTA', city: 'Salt Lake City' },
  { name: 'Winnipeg Jets',      id: '88d85b2b-7a91-4679-b1d4-e45d73e3838f', abbr: 'WPG', city: 'Winnipeg'      },
];

export default function CentralPage() {
  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory">Directory</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory/nhl">NHL</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Central Division</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1 }}>
          NHL CENTRAL DIVISION
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          7 teams • Western Conference
        </p>
      </div>

      </div>

      {/* Ticketmaster NHL Banner - 468x60 */}
      <TicketmasterAd size="468x60" />

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
        {[
          { label: 'All NHL', href: '/directory/nhl' },
          { label: 'Pacific', href: '/directory/nhl/pacific' },
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
        {CENTRAL_TEAMS.map(t => (
          <Link key={t.id} href={`/directory/teams/${t.id}`} style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            background: 'var(--s2)', border: '1px solid var(--border)',
            borderRadius: '6px', padding: '0.875rem 1rem', textDecoration: 'none',
          }}>
            <TeamLogo abbr={t.abbr} city={t.city} fallbackColor="#C8102E" size={36} />
            <div>
              <p style={{ fontWeight: 700, fontSize: '0.875rem', color: '#fff' }}>{t.name}</p>
              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>{t.city}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Ticketmaster NHL Banner - 300x250 */}
      <TicketmasterAd size="300x250" style={{ marginTop: '1.5rem' }} />
    </main>
  );
}