import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'USHL  --  United States Hockey League | RinkStop',
  description: 'Coverage of the USHL (United States Hockey League)  --  top junior hockey in the US with 17 teams. Premier development path for NCAA and professional hockey.',
};

export default function USHLPage() {
  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/" style={{ color: '#555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory" style={{ color: '#555' }}>Directory</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory/junior" style={{ color: '#555' }}>Junior</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>USHL</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1 }}>
          USHL  --  UNITED STATES HOCKEY LEAGUE
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          Top junior league in the United States. 17 teams. Premier development path for NCAA Division I players.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
        {[
          { label: 'Junior Hockey', href: '/directory/junior' },
          { label: 'OHL', href: '/directory/junior/ohl' },
          { label: 'WHL', href: '/directory/junior/whl' },
          { label: 'QMJHL', href: '/directory/junior/qmjhl' },
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

      <div style={{ background: 'linear-gradient(135deg, #041E42 0%, #0a2d5a 100%)', border: '1px solid rgba(4,30,66,0.5)', borderRadius: '8px', padding: '1.5rem 2rem', marginBottom: '2rem' }}>
        <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem' }}>United States Hockey League  --  Top Tier US Junior</p>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.75rem', color: '#fff', letterSpacing: '0.04em' }}>17 TEAMS • UNITED STATES</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', marginTop: '0.5rem' }}>Founded 1972 • USA Hockey&apos;s top junior league</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '2rem' }}>
        {[
          { label: 'Teams', value: '17' },
          { label: 'Age Range', value: '16-20' },
          { label: 'Founded', value: '1972' },
          { label: 'NCAA Path', value: 'Yes' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '1rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: '0.25rem' }}>{s.label}</p>
            <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.25rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>ABOUT THE USHL</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', lineHeight: 1.8, marginBottom: '1rem' }}>
          The United States Hockey League is the top junior hockey league in the United States and one of the premier development leagues in North America. Unlike Canadian Major Junior leagues, USHL players typically use their junior years to develop while maintaining NCAA eligibility. Many USHL players go on to play NCAA Division I hockey before turning professional. The USHL is often referred to as the &quot;USNTDP pipeline&quot; complement, with many players advancing to the US National Team Development Program and NCAA powerhouse programs.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link href="/directory/junior" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600 }}>All Junior Leagues →</Link>
          <Link href="/directory/college" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600 }}>College Hockey →</Link>
        </div>
      </div>
    </main>
  );
}
