import type { Metadata } from 'next';
import Link from 'next/link';
import TeamLogo from '@/components/TeamLogo';
import TicketmasterAd from '@/components/TicketmasterAd';

export const metadata: Metadata = {
  title: 'NHL Western Conference',
  description: 'All 16 NHL Western Conference teams  --  Central and Pacific divisions.',
};

const CENTRAL_TEAMS = [
  { name: 'Colorado Avalanche',   slug: 'colorado-avalanche',   abbr: 'COL', city: 'Denver'        },
  { name: 'Dallas Stars',         slug: 'dallas-stars',          abbr: 'DAL', city: 'Dallas'        },
  { name: 'Minnesota Wild',       slug: 'minnesota-wild',        abbr: 'MIN', city: 'Saint Paul'    },
  { name: 'Nashville Predators',  slug: 'nashville-predators',   abbr: 'NSH', city: 'Nashville'     },
  { name: 'St. Louis Blues',      slug: 'st-louis-blues',        abbr: 'STL', city: 'St. Louis'     },
  { name: 'Utah Hockey Club',     slug: 'utah-hockey-club',      abbr: 'UTA', city: 'Salt Lake City' },
  { name: 'Winnipeg Jets',        slug: 'winnipeg-jets',         abbr: 'WPG', city: 'Winnipeg'      },
];

const PACIFIC_TEAMS = [
  { name: 'Anaheim Ducks',          slug: 'anaheim-ducks',          abbr: 'ANA', city: 'Anaheim'      },
  { name: 'Calgary Flames',         slug: 'calgary-flames',         abbr: 'CGY', city: 'Calgary'      },
  { name: 'Edmonton Oilers',        slug: 'edmonton-oilers',        abbr: 'EDM', city: 'Edmonton'     },
  { name: 'Los Angeles Kings',     slug: 'los-angeles-kings',      abbr: 'LAK', city: 'Los Angeles'  },
  { name: 'San Jose Sharks',       slug: 'san-jose-sharks',        abbr: 'SJS', city: 'San Jose'    },
  { name: 'Seattle Kraken',        slug: 'seattle-kraken',         abbr: 'SEA', city: 'Seattle'      },
  { name: 'Vancouver Canucks',     slug: 'vancouver-canucks',      abbr: 'VAN', city: 'Vancouver'   },
  { name: 'Vegas Golden Knights',  slug: 'vegas-golden-knights',   abbr: 'VGK', city: 'Las Vegas'    },
];

function TeamCard({ t, fallback }: { t: typeof CENTRAL_TEAMS[0]; fallback: string }) {
  return (
    <Link href={`/directory/teams/${t.slug}`} style={{
      display: 'flex', alignItems: 'center', gap: '0.75rem',
      background: 'var(--s2)', border: '1px solid var(--border)',
      borderRadius: '6px', padding: '0.875rem 1rem', textDecoration: 'none',
    }}>
      <TeamLogo abbr={t.abbr} city={t.city} fallbackColor={fallback} size={36} />
      <div>
        <p style={{ fontWeight: 700, fontSize: '0.875rem', color: '#fff' }}>{t.name}</p>
        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>{t.city}</p>
      </div>
    </Link>
  );
}

export default function NHLWesternPage() {
  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory">Directory</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory/nhl">NHL</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Western Conference</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1 }}>
          NHL WESTERN CONFERENCE
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          16 teams • Central & Pacific divisions
        </p>
      </div>

      {/* Ticketmaster NHL Banner - 468x60 */}
      <TicketmasterAd size="468x60" />

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
        {[
          { label: 'All NHL', href: '/directory/nhl' },
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

      <div style={{ marginBottom: '2rem' }}>
        <h2 className="font-sport" style={{ fontSize: '1.125rem', color: '#C8102E', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>CENTRAL DIVISION</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.625rem' }}>
          {CENTRAL_TEAMS.map(t => <TeamCard key={t.slug} t={t} fallback="#C8102E" />)}
        </div>
      </div>

      <div>
        <h2 className="font-sport" style={{ fontSize: '1.125rem', color: '#1E5B9C', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>PACIFIC DIVISION</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.625rem' }}>
          {PACIFIC_TEAMS.map(t => <TeamCard key={t.slug} t={t} fallback="#1E5B9C" />)}
        </div>
      </div>

      {/* Ticketmaster NHL Banner - 300x250 */}
      <TicketmasterAd size="300x250" style={{ marginTop: '1.5rem' }} />
    </main>
  );
}