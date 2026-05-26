import type { Metadata } from 'next';
import Link from 'next/link';
import TeamLogo from '@/components/TeamLogo';
import TicketmasterAd from '@/components/TicketmasterAd';

export const metadata: Metadata = {
  title: 'NHL Metropolitan Division | RinkStop',
  description: 'NHL Metropolitan Division  --  Carolina, Columbus, New Jersey, NY Islanders, NY Rangers, Philadelphia, Pittsburgh, Washington.',
};

const METRO_TEAMS = [
  { name: 'Carolina Hurricanes',   id: 'e4977c12-28b3-4756-a788-cf86b40fc237', abbr: 'CAR', city: 'Raleigh'       },
  { name: 'Columbus Blue Jackets', id: '6ca5c5f0-3c27-4cd5-8457-78fc3ba45344', abbr: 'CBJ', city: 'Columbus'      },
  { name: 'New Jersey Devils',     id: '486e6592-5873-48a0-8cdd-8411c8eb1105', abbr: 'NJD', city: 'Newark'        },
  { name: 'New York Islanders',   id: 'acc8b466-ef9b-4d81-8ea5-6f13fc180d9e', abbr: 'NYI', city: 'Elmont'        },
  { name: 'New York Rangers',    id: '2869d1cd-d8f4-4ffb-9726-30bdfdbc14d3', abbr: 'NYR', city: 'New York'      },
  { name: 'Philadelphia Flyers',  id: 'cf53124a-dbb5-4588-9cb2-2f6054918f99', abbr: 'PHI', city: 'Philadelphia'  },
  { name: 'Pittsburgh Penguins', id: '4b75202e-b11b-4574-8ae6-7447f962cb55', abbr: 'PIT', city: 'Pittsburgh'    },
  { name: 'Washington Capitals',  id: '2df72ff0-5a54-4663-91eb-13bb2a2830aa', abbr: 'WSH', city: 'Washington'    },
];

export default function MetropolitanPage() {
  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory">Directory</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory/nhl">NHL</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Metropolitan Division</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1 }}>
          NHL METROPOLITAN DIVISION
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          8 teams • Eastern Conference
        </p>
      </div>

      {/* Ticketmaster NHL Banner - 468x60 */}
      <TicketmasterAd size="468x60" />

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
        {[
          { label: 'All NHL', href: '/directory/nhl' },
          { label: 'Atlantic', href: '/directory/nhl/atlantic' },
          { label: 'Western Conf.', href: '/directory/nhl/western' },
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
        {METRO_TEAMS.map(t => (
          <Link key={t.id} href={`/directory/teams/${t.id}`} style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            background: 'var(--s2)', border: '1px solid var(--border)',
            borderRadius: '6px', padding: '0.875rem 1rem', textDecoration: 'none',
          }}>
            <TeamLogo abbr={t.abbr} city={t.city} fallbackColor="#1E3A5F" size={36} />
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