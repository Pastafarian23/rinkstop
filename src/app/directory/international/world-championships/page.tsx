import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'IIHF World Championships',
  description: 'Coverage of the IIHF Men\'s World Championship, Women\'s World Championship, and age-group tournaments. Annual international hockey competition.',
};

export default function WorldChampionshipsPage() {
  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/" style={{ color: '#555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory" style={{ color: '#555' }}>Directory</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory/international" style={{ color: '#555' }}>International</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>World Championships</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1 }}>
          IIHF WORLD CHAMPIONSHIPS
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          Annual international competitions contested by national teams.
        </p>
      </div>

      {/* Sub-nav */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
        {[
          { label: 'IIHF', href: '/directory/international/iihf' },
          { label: 'Men\'s', href: '/directory/international/world-championships' },
          { label: 'Women\'s', href: '/directory/international/world-championships' },
          { label: 'Countries', href: '/directory/countries' },
        ].map(n => (
          <Link key={n.label} href={n.href} style={{
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

      {/* Current champions highlight */}
      <div style={{ background: 'linear-gradient(135deg, #041E42 0%, #0a2d5a 100%)', border: '1px solid rgba(200,16,46,0.3)', borderRadius: '8px', padding: '1.5rem 2rem', marginBottom: '2rem' }}>
        <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#C8102E', marginBottom: '0.5rem' }}>2025 World Champion</p>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', color: '#fff', letterSpacing: '0.04em' }}>🇨🇦 CANADA</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', marginTop: '0.5rem' }}>2025 Men\'s World Championship  --  Prague, Czech Republic</p>
      </div>

      {/* Tournament grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          {
            name: 'Men\'s World Championship',
            color: '#C8102E',
            desc: 'Top-tier annual competition featuring the world\'s best national teams. Played in May after NHL playoffs.',
            years: 'Annual • May',
            note: '16 teams • TopDivision',
          },
          {
            name: 'Women\'s World Championship',
            color: '#C8102E',
            desc: 'Premier women\'s international competition. Top national teams competing for world gold.',
            years: 'Annual • April',
            note: 'Top teams from worldwide',
          },
          {
            name: 'U20 World Junior Championship',
            color: '#041E42',
            desc: 'NHL draft prospects representing their countries. One of the most-watched hockey events globally.',
            years: 'Annual • December-January',
            note: '10 teams • NHL prospects',
          },
          {
            name: 'U18 World Championship',
            color: '#1E5B9C',
            desc: 'Future stars of international hockey. Top under-18 talent from around the world.',
            years: 'Annual • April',
            note: 'Future draft picks',
          },
          {
            name: 'Women\'s U18 Championship',
            color: '#1E5B9C',
            desc: 'Young women\'s hockey talent on display. Future PWHL and national team players.',
            years: 'Annual • December',
            note: 'Top U18 women',
          },
        ].map(t => (
          <div key={t.name} style={{
            background: 'var(--s2)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '1.25rem 1.5rem',
          }}>
            <span style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: t.color }}>IIHF Event</span>
            <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.125rem', color: '#fff', letterSpacing: '0.04em', marginTop: '0.25rem' }}>{t.name}</h3>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8125rem', marginTop: '0.5rem', lineHeight: 1.6 }}>{t.desc}</p>
            <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)' }}>{t.years}</span>
              <span style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.3)' }}>{t.note}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Past champions */}
      <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.5rem 2rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.25rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1.25rem' }}>RECENT MEN'S CHAMPIONS</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '1rem' }}>
          {[
            { year: '2025', champ: 'Canada', flag: '🇨🇦' },
            { year: '2024', champ: 'Canada', flag: '🇨🇦' },
            { year: '2023', champ: 'Canada', flag: '🇨🇦' },
            { year: '2022', champ: 'Finland', flag: '🇫🇮' },
            { year: '2021', champ: 'Canada', flag: '🇨🇦' },
            { year: '2019', champ: 'Finland', flag: '🇫🇮' },
            { year: '2018', champ: 'Sweden', flag: '🇸🇪' },
          ].map(r => (
            <div key={r.year} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.25)', marginBottom: '0.25rem' }}>{r.year}</div>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{r.flag}</div>
              <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)' }}>{r.champ}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}