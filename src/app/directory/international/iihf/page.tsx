import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'IIHF — International Ice Hockey Federation: Tournaments, Rankings & Member Nations',
  description: 'Coverage of the International Ice Hockey Federation (IIHF), including World Championships, U20 World Junior Championship, U18, women\'s tournaments, and 60+ member nations.',
};

export default function IIHFPage() {
  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/" style={{ color: '#555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory" style={{ color: '#555' }}>Directory</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory/international" style={{ color: '#555' }}>International</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>IIHF</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1 }}>
          IIHF  --  INTERNATIONAL ICE HOCKEY FEDERATION
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          Governing body for ice hockey worldwide. 60+ member nations competing across multiple age groups and divisions.
        </p>
      </div>

      {/* Quick links */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
        {[
          { label: 'World Championship', href: '/directory/international/world-championships' },
          { label: 'Olympics', href: '/directory/international/olympics' },
          { label: 'Countries', href: '/directory/countries' },
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

      {/* Tournaments */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          {
            name: 'Men\'s World Championship',
            abbr: 'WM',
            color: '#C8102E',
            desc: 'Top-tier annual competition. The world\'s best players representing their nations.',
            timing: 'May • Annual',
          },
          {
            name: 'U20 World Junior Championship',
            abbr: 'WJC',
            color: '#041E42',
            desc: 'NHL draft prospects compete for gold. Held annually in late December/early January.',
            timing: 'December-January',
          },
          {
            name: 'U18 World Championship',
            abbr: 'U18 WM',
            color: '#1E5B9C',
            desc: 'Top under-18 talent from around the world. Future stars on the big stage.',
            timing: 'April • Annual',
          },
          {
            name: 'Women\'s World Championship',
            abbr: 'WW',
            color: '#C8102E',
            desc: 'Elite women\'s national teams competing for world supremacy.',
            timing: 'April • Annual',
          },
          {
            name: 'Women\'s U18 Championship',
            abbr: 'U18 W',
            color: '#1E5B9C',
            desc: 'Future women\'s hockey stars. Top under-18 talent worldwide.',
            timing: 'December • Annual',
          },
          {
            name: 'Senior Men\'s',
            abbr: 'WM 65+',
            color: '#1E7B1E',
            desc: 'Senior men\'s competition for players 35+ and 45+ age groups.',
            timing: 'Annual',
          },
        ].map(t => (
          <div key={t.abbr} style={{
            background: 'var(--s2)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '1.25rem 1.5rem',
          }}>
            <span style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: t.color }}>{t.abbr}</span>
            <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.125rem', color: '#fff', letterSpacing: '0.04em', marginTop: '0.25rem' }}>{t.name}</h3>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8125rem', marginTop: '0.5rem', lineHeight: 1.6 }}>{t.desc}</p>
            <span style={{ display: 'inline-block', marginTop: '0.75rem', fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)' }}>{t.timing}</span>
          </div>
        ))}
      </div>

      {/* About IIHF */}
      <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.5rem 2rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.25rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>ABOUT THE IIHF</h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', lineHeight: 1.8 }}>
          The International Ice Hockey Federation (IIHF) is the governing body of ice hockey worldwide and is based in Zurich, Switzerland. Founded in 1908, it manages international tournaments and sets the rules of the sport. The IIHF currently has 60+ member nations across five continents and organizes world championships at various levels  --  senior, junior, and youth  --  for both men and women.
        </p>
        <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <a href="https://www.iihf.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600 }}>iihf.com →</a>
          <Link href="/directory/countries" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600 }}>Browse by Country →</Link>
        </div>
      </div>
    </main>
  );
}