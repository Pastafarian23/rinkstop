import type { Metadata } from 'next';
import Link from 'next/link';
import TeamLogo from '@/components/TeamLogo';
import TicketmasterAd from '@/components/TicketmasterAd';

export const metadata: Metadata = {
  title: 'NHL Atlantic Division | RinkStop',
  description: 'NHL Atlantic Division  --  Boston, Buffalo, Detroit, Florida, Montreal, Ottawa, Toronto, Tampa Bay.',
};

const ATLANTIC_TEAMS = [
  { name: 'Boston Bruins',         id: 'ae6d0878-1ac2-4c13-afc8-890c6647b668', abbr: 'BOS', city: 'Boston'    },
  { name: 'Buffalo Sabres',         id: '5a510c0e-1058-460d-8237-09855dfa98f4', abbr: 'BUF', city: 'Buffalo'    },
  { name: 'Detroit Red Wings',       id: 'f3fa0794-ee39-4991-af45-961cb3e8f404', abbr: 'DET', city: 'Detroit'    },
  { name: 'Florida Panthers',       id: '7772070c-6c9b-4ca0-a442-dfe5b8beabcb', abbr: 'FLA', city: 'Sunrise'    },
  { name: 'Montreal Canadiens',    id: 'dfa8a4b4-01b9-4f53-9a5d-6ca34302d074', abbr: 'MTL', city: 'Montreal'   },
  { name: 'Ottawa Senators',        id: 'a1f8b7f1-f7ea-42ee-9861-0eb0addf437d', abbr: 'OTT', city: 'Ottawa'     },
  { name: 'Toronto Maple Leafs',    id: 'bac49d62-fd43-48f5-8811-090ec8f4c76d', abbr: 'TOR', city: 'Toronto'    },
  { name: 'Tampa Bay Lightning',   id: '2f4c6364-2139-4e57-97ad-e01dc55418fa', abbr: 'TBL', city: 'Tampa'      },
];

export default function AtlanticPage() {
  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory">Directory</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory/nhl">NHL</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Atlantic Division</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1 }}>
          NHL ATLANTIC DIVISION
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
          { label: 'Metropolitan', href: '/directory/nhl/metropolitan' },
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
        {ATLANTIC_TEAMS.map(t => (
          <Link key={t.id} href={`/directory/teams/${t.id}`} style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            background: 'var(--s2)', border: '1px solid var(--border)',
            borderRadius: '6px', padding: '0.875rem 1rem', textDecoration: 'none',
          }}>
            <TeamLogo abbr={t.abbr} city={t.city} fallbackColor="#041E42" size={36} />
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