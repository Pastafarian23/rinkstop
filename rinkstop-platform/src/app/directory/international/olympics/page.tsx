import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Olympic Ice Hockey | RinkStop',
  description: 'Coverage of Olympic ice hockey competitions — men\'s and women\'s tournaments at the Winter Olympics. NHL players representing their nations.',
};

export default function OlympicsPage() {
  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/" style={{ color: '#555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory" style={{ color: '#555' }}>Directory</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory/international" style={{ color: '#555' }}>International</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>Olympics</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1 }}>
          OLYMPIC ICE HOCKEY
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          The world&apos;s premier international hockey tournament. Held every four years.
        </p>
      </div>

      {/* Quick links */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
        {[
          { label: 'IIHF', href: '/directory/international/iihf' },
          { label: 'World Championships', href: '/directory/international/world-championships' },
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

      {/* Next Olympics */}
      <div style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #1E5B9C 100%)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: '8px', padding: '1.5rem 2rem', marginBottom: '2rem' }}>
        <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#FFD700', marginBottom: '0.5rem' }}>Next Tournament: 2026</p>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', color: '#fff', letterSpacing: '0.04em' }}>🇮🇹 MILANO-CORTINA 2026</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', marginTop: '0.5rem' }}>Men&apos;s and Women&apos;s ice hockey at the Winter Olympics in Italy.</p>
      </div>

      {/* Tournament info */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          {
            name: "Men's Tournament",
            color: '#C8102E',
            desc: 'Top NHL players represent their nations. The most prestigious international tournament in hockey.',
            history: 'Since 1920',
            participants: '12 teams',
          },
          {
            name: "Women's Tournament",
            color: '#C8102E',
            desc: 'Premier women&apos;s national team competition at the Olympics. PWHL stars representing their countries.',
            history: 'Since 1998',
            participants: '10 teams',
          },
        ].map(t => (
          <div key={t.name} style={{
            background: 'var(--s2)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '1.25rem 1.5rem',
          }}>
            <span style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: t.color }}>Event</span>
            <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.125rem', color: '#fff', letterSpacing: '0.04em', marginTop: '0.25rem' }}>{t.name}</h3>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8125rem', marginTop: '0.5rem', lineHeight: 1.6 }}>{t.desc}</p>
            <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.3)' }}>{t.history}</span>
              <span style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.3)' }}>{t.participants}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Olympic history */}
      <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.5rem 2rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.25rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1.25rem' }}>RECENT GOLD MEDALISTS</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' }}>
          {[
            { year: '2022 Beijing', men: '🇷🇺 Russia', women: '🇺🇸 USA', menFlag: '🇷🇺', womenFlag: '🇺🇸' },
            { year: '2018 PyeongChang', men: '🇷🇺 OAR', women: '🇺🇸 USA', menFlag: '🇷🇺', womenFlag: '🇺🇸' },
            { year: '2014 Sochi', men: '🇨🇦 Canada', women: '🇨🇦 Canada', menFlag: '🇨🇦', womenFlag: '🇨🇦' },
            { year: '2010 Vancouver', men: '🇨🇦 Canada', women: '🇺🇸 USA', menFlag: '🇨🇦', womenFlag: '🇺🇸' },
          ].map(r => (
            <div key={r.year} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '6px', padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.25)', marginBottom: '0.5rem' }}>{r.year}</div>
              <div style={{ marginBottom: '0.25rem' }}>{r.menFlag}</div>
              <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem' }}>Men: {r.men}</div>
              <div style={{ marginBottom: '0.25rem' }}>{r.womenFlag}</div>
              <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)' }}>Women: {r.women}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          <Link href="/directory/countries" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600 }}>Browse All Countries →</Link>
        </div>
      </div>
    </main>
  );
}