import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Youth Hockey Tournaments',
  description: 'Find youth hockey tournaments for mites, squirts, pee-wee, bantam, and midget levels. Regional and national tournament listings.',
};

export default function YouthTournamentsPage() {
  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/">Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory">Directory</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Youth Tournaments</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1 }}>
          YOUTH HOCKEY TOURNAMENTS
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          Competitive tournament hockey for youth players of all ages and levels.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
        {[
          { label: 'Learn to Play', href: '/directory/youth-hockey/learn-to-play' },
          { label: 'Youth Hockey', href: '/directory/youth-hockey' },
          { label: 'Adult Leagues', href: '/directory/youth-hockey/adult-leagues' },
          { label: 'Adult Tournaments', href: '/directory/youth-hockey/adult-tournaments' },
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
          { level: 'Mite (8U)', ages: 'Under 8', note: 'House and travel tournaments. Focus on development and fun.', color: '#4A90D9' },
          { level: 'Squito (10U)', ages: 'Under 10', note: 'Travel tournament level. Cross-ice and full-ice formats.', color: '#C8102E' },
          { level: 'Pee-Wee (12U)', ages: 'Under 12', note: 'Competitive tier structure. AAA, A, B levels. State and regional tournaments.', color: '#1E7B1E' },
          { level: 'Bantam (14U)', ages: 'Under 14', note: 'High-level competition. State championships and national invitationals.', color: '#7B3FA0' },
          { level: 'Midget (16U/18U)', ages: 'Under 16/18', note: 'Top youth level. High school prep, junior placement, college showcase.', color: '#FFB81C' },
          { level: 'Girls/Women\'s', ages: 'All ages', note: 'Girls youth tournaments at every level including USA Hockey national championships.', color: '#C8102E' },
        ].map(t => (
          <div key={t.level} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.25rem' }}>
            <span style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: t.color }}>{t.level}</span>
            <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.125rem', color: '#fff', letterSpacing: '0.04em', marginTop: '0.25rem', marginBottom: '0.5rem' }}>{t.ages}</h3>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8125rem', lineHeight: 1.6 }}>{t.note}</p>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.25rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>FINDING TOURNAMENTS</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', lineHeight: 1.8, marginBottom: '1rem' }}>
          Tournament schedules vary by region. Check with your local hockey association or league for their tournament calendar. Major tournament series like the Huber Breakaway Cup, state hockey associations, and USA Hockey have listings for sanctioned events across the country.
        </p>
        <Link href="/directory/rinks" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600 }}>Find Rinks Near You →</Link>
      </div>
    </main>
  );
}
