import type { Metadata } from 'next';
import Link from 'next/link';
import TeamLogo from '@/components/TeamLogo';

export const metadata: Metadata = {
  title: 'NHL Eastern Conference',
  description: 'All 16 NHL Eastern Conference teams  --  Atlantic and Metropolitan divisions.',
};

const ATLANTIC_TEAMS = [
  { name: 'Boston Bruins',          slug: 'boston-bruins',         abbr: 'BOS', city: 'Boston'      },
  { name: 'Buffalo Sabres',         slug: 'buffalo-sabres',        abbr: 'BUF', city: 'Buffalo'      },
  { name: 'Detroit Red Wings',      slug: 'detroit-red-wings',     abbr: 'DET', city: 'Detroit'      },
  { name: 'Florida Panthers',       slug: 'florida-panthers',      abbr: 'FLA', city: 'Sunrise'      },
  { name: 'Montreal Canadiens',     slug: 'montreal-canadiens',    abbr: 'MTL', city: 'Montreal'     },
  { name: 'Ottawa Senators',        slug: 'ottawa-senators',       abbr: 'OTT', city: 'Ottawa'       },
  { name: 'Toronto Maple Leafs',    slug: 'toronto-maple-leafs',   abbr: 'TOR', city: 'Toronto'     },
  { name: 'Tampa Bay Lightning',    slug: 'tampa-bay-lightning',   abbr: 'TBL', city: 'Tampa'       },
];

const METRO_TEAMS = [
  { name: 'Carolina Hurricanes',    slug: 'carolina-hurricanes',   abbr: 'CAR', city: 'Raleigh'       },
  { name: 'Columbus Blue Jackets',  slug: 'columbus-blue-jackets', abbr: 'CBJ', city: 'Columbus'      },
  { name: 'New Jersey Devils',      slug: 'new-jersey-devils',     abbr: 'NJD', city: 'Newark'        },
  { name: 'New York Islanders',     slug: 'new-york-islanders',    abbr: 'NYI', city: 'Elmont'        },
  { name: 'New York Rangers',       slug: 'new-york-rangers',      abbr: 'NYR', city: 'New York'      },
  { name: 'Philadelphia Flyers',    slug: 'philadelphia-flyers',   abbr: 'PHI', city: 'Philadelphia'  },
  { name: 'Pittsburgh Penguins',    slug: 'pittsburgh-penguins',   abbr: 'PIT', city: 'Pittsburgh'    },
  { name: 'Washington Capitals',    slug: 'washington-capitals',   abbr: 'WSH', city: 'Washington'    },
];

function TeamCard({ t, fallback }: { t: typeof ATLANTIC_TEAMS[0]; fallback: string }) {
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

export default function NHLEasternPage() {
  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory">Directory</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory/nhl">NHL</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Eastern Conference</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1 }}>
          NHL EASTERN CONFERENCE
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          16 teams • Atlantic & Metropolitan divisions
        </p>
      </div>

      {/* Ticketmaster NHL Banner - 468x60 */}

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
        {[
          { label: 'All NHL', href: '/directory/nhl' },
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

      <div style={{ marginBottom: '2rem' }}>
        <h2 className="font-sport" style={{ fontSize: '1.125rem', color: '#C8102E', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>ATLANTIC DIVISION</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.625rem' }}>
          {ATLANTIC_TEAMS.map(t => <TeamCard key={t.slug} t={t} fallback="#041E42" />)}
        </div>
      </div>

      <div>
        <h2 className="font-sport" style={{ fontSize: '1.125rem', color: '#1E5B9C', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>METROPOLITAN DIVISION</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.625rem' }}>
          {METRO_TEAMS.map(t => <TeamCard key={t.slug} t={t} fallback="#1E3A5F" />)}
        </div>
      </div>

      {/* Ticketmaster NHL Banner - 300x250 */}
    </main>
  );
}