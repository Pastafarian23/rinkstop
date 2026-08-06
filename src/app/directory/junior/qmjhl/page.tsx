import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'QMJHL  --  Quebec Maritimes Junior Hockey League',
  description: 'Coverage of the QMJHL (Quebec Maritimes Junior Hockey League)  --  18 teams across Quebec and the Atlantic provinces. Top French-language junior hockey.',
};

export default function QMJHLPage() {
  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [{
            '@type': 'SportsOrganization',
            '@id': 'https://rinkstop.com/directory/junior/qmjhl',
            name: 'QUEBEC MARITIMES JR.',
            url: 'https://rinkstop.com/directory/junior/qmjhl',
            sport: 'Ice Hockey',
            description: "Quebec Maritimes Junior Hockey League — Major Junior league covering Quebec and Atlantic Canada.",
            foundingDate: '1969',
            sameAs: ['https://en.wikipedia.org/wiki/Quebec_Maritimes_Junior_Hockey_League'],
          }],
        }) }}
      />
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/" style={{ color: '#555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory" style={{ color: '#555' }}>Directory</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory/junior" style={{ color: '#555' }}>Junior</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>QMJHL</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1 }}>
          QMJHL  --  QUEBEC MARITIMES JR.
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          18 teams across Quebec and Atlantic Canada. Premier French-language junior hockey league.
        </p>
      </div>

      <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.9375rem', lineHeight: 1.7, marginTop: '0.75rem' }}>
        The Quebec Maritimes Junior Hockey League is one of three Major Junior leagues that make up the Canadian Hockey League (CHL) alongside the Ontario Hockey League (OHL) and Western Hockey League (WHL). The QMJHL fields 18 teams across the provinces of Quebec and the four Atlantic provinces (New Brunswick, Nova Scotia, Prince Edward Island, and Newfoundland and Labrador), making it the only Major Junior league with teams outside central Canada. The league was founded in 1969, and players are typically aged 16 to 20. The QMJHL is widely regarded as one of the top NHL development pipelines, with roughly 30-40% of NHL draft picks who developed in Quebec or the Maritimes having come through the league. The QMJHL championship trophy is the President's Cup; the playoff winner advances to compete in the Memorial Cup against the OHL and WHL champions.
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
        {[
          { label: 'Junior Hockey', href: '/directory/junior' },
          { label: 'OHL', href: '/directory/junior/ohl' },
          { label: 'WHL', href: '/directory/junior/whl' },
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

      <div style={{ background: 'linear-gradient(135deg, #1E5B9C 0%, #041E42 100%)', border: '1px solid rgba(30,91,156,0.3)', borderRadius: '8px', padding: '1.5rem 2rem', marginBottom: '2rem' }}>
        <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#60A5FA', marginBottom: '0.5rem' }}>Quebec Maritimes Junior Hockey League  --  Major Junior</p>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.75rem', color: '#fff', letterSpacing: '0.04em' }}>18 TEAMS • QC + ATLANTIC CANADA</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', marginTop: '0.5rem' }}>Founded 1969 • Part of Canadian Hockey League (CHL)</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '2rem' }}>
        {[
          { label: 'Teams', value: '18' },
          { label: 'Age Range', value: '16-20' },
          { label: 'Founded', value: '1969' },
          { label: 'CHL Member', value: 'Yes' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '1rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: '0.25rem' }}>{s.label}</p>
            <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.25rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>ABOUT THE QMJHL</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', lineHeight: 1.8, marginBottom: '1rem' }}>
          The Quebec Maritimes Junior Hockey League is one of three Major Junior leagues in the CHL, and the only one in the predominantly French-speaking province of Quebec. The league has produced many NHL stars, including Mario Lemieux and Guy Carbonneau. The QMJHL is known for its fast-paced, skilled style of play and its passionate fanbase. The league also runs the annual NHL Draft Combine. The QMJHL season runs from September to March, culminating in the Memorial Cup.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link href="/directory/junior" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600 }}>All Junior Leagues →</Link>
          <Link href="/directory/college" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600 }}>College Path →</Link>
        </div>
      </div>
    </main>
  );
}
