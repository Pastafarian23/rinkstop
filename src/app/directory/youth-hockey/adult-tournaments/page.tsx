import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Adult Hockey Tournaments | RinkStop',
  description: 'Find adult hockey tournaments for recreational and competitive adult teams. Tournament listings for beer leagues, corporate teams, and senior hockey.',
};

export default function AdultTournamentsPage() {
  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory">Directory</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Adult Tournaments</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1 }}>
          ADULT HOCKEY TOURNAMENTS
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          Competitive and recreational adult hockey tournaments across North America.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
        {[
          { label: 'Learn to Play', href: '/directory/youth-hockey/learn-to-play' },
          { label: 'Youth Hockey', href: '/directory/youth-hockey' },
          { label: 'Youth Tournaments', href: '/directory/youth-hockey/tournaments' },
          { label: 'Adult Leagues', href: '/directory/youth-hockey/adult-leagues' },
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
          { name: 'USA Hockey Adult Championships', level: 'Recreational to Elite', locations: 'Various US cities', note: 'Annual national championships for adult teams across all levels.' },
          { name: 'State Adult Hockey Championships', level: 'Recreational to Intermediate', locations: 'Various states', note: 'State-level tournaments run by local hockey associations year-round.' },
          { name: 'Corporate Hockey Tournaments', level: 'Recreational', locations: 'Major cities', note: 'Company teams competing in regional and national corporate tournaments.' },
          { name: 'Senior (40+) Hockey', level: 'Intermediate', locations: 'Various', note: 'Tournaments for players 40 and older with modified rules and competitive spirit.' },
          { name: 'Beer League Tournaments', level: 'Recreational', locations: 'Regional', note: 'Fun, low-pressure tournaments designed specifically for recreational adult leagues.' },
          { name: 'Charity & Community Events', level: 'All levels', locations: 'Nationwide', note: 'Fundraising tournaments supporting various causes. Often open to any adult team.' },
        ].map(t => (
          <div key={t.name} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.25rem' }}>
            <span style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--red)' }}>{t.level}</span>
            <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.125rem', color: '#fff', letterSpacing: '0.04em', marginTop: '0.25rem', marginBottom: '0.5rem' }}>{t.name}</h3>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginBottom: '0.5rem' }}>{t.locations}</p>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8125rem', lineHeight: 1.6 }}>{t.note}</p>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.25rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>FINDING ADULT TOURNAMENTS</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', lineHeight: 1.8, marginBottom: '1rem' }}>
          Check with your local rink or adult hockey league commissioner for tournament listings in your area. Many major tournaments are listed through USA Hockey and state hockey association websites. Rinks that run adult leagues typically publish annual tournament calendars on their websites.
        </p>
        <Link href="/directory/rinks" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600 }}>Find Rinks Near You →</Link>
      </div>
    </main>
  );
}
