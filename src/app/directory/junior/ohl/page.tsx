import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'OHL  --  Ontario Hockey League | RinkStop',
  description: 'Coverage of the OHL (Ontario Hockey League)  --  top junior hockey league with 20 teams across Ontario, Canada. Premier NHL draft prospect pipeline.',
};

export default function OHLPage() {
  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/" style={{ color: '#555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory" style={{ color: '#555' }}>Directory</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory/junior" style={{ color: '#555' }}>Junior</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>OHL</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1 }}>
          OHL  --  ONTARIO HOCKEY LEAGUE
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          Top junior hockey in Ontario, Canada. 20 teams. Major CHL league and NHL draft pipeline.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
        {[
          { label: 'Junior Hockey', href: '/directory/junior' },
          { label: 'WHL', href: '/directory/junior/whl' },
          { label: 'QMJHL', href: '/directory/junior/qmjhl' },
          { label: 'USHL', href: '/directory/junior/ushl' },
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

      <div style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #1E3A8A 100%)', border: '1px solid rgba(30,58,138,0.3)', borderRadius: '8px', padding: '1.5rem 2rem', marginBottom: '2rem' }}>
        <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#60A5FA', marginBottom: '0.5rem' }}>Ontario Hockey League  --  Major Junior</p>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.75rem', color: '#fff', letterSpacing: '0.04em' }}>20 TEAMS • ONTARIO, CANADA</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', marginTop: '0.5rem' }}>Founded 1980 • Part of Canadian Hockey League (CHL)</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '2rem' }}>
        {[
          { label: 'Teams', value: '20' },
          { label: 'Age Range', value: '16-20' },
          { label: 'Founded', value: '1980' },
          { label: 'CHL Member', value: 'Yes' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '1rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: '0.25rem' }}>{s.label}</p>
            <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.25rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>ABOUT THE OHL</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', lineHeight: 1.8, marginBottom: '1rem' }}>
          The Ontario Hockey League is one of three Major Junior leagues that make up the Canadian Hockey League (CHL). It is widely considered one of the top junior hockey leagues in the world, producing numerous NHL stars annually. Players in the OHL are typically ages 16-20 and receive full-time hockey development along with education opportunities. The OHL season runs from late September through March, culminating in the Memorial Cup championship.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link href="/directory/junior" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600 }}>All Junior Leagues →</Link>
          <Link href="/directory/college" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600 }}>College Path →</Link>
        </div>
      </div>
    </main>
  );
}