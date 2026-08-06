import type { Metadata } from 'next';
import Link from 'next/link';
import { LeagueTeams } from '@/components/LeagueTeams';

export const metadata: Metadata = {
  title: 'WHL  --  Western Hockey League',
  description: 'Coverage of the WHL (Western Hockey League)  --  22 teams across Western Canada and the US Pacific Northwest. Major CHL league and NHL draft pipeline.',
};

export default function WHLPage() {
  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [{
            '@type': 'SportsOrganization',
            '@id': 'https://rinkstop.com/directory/junior/whl',
            name: 'WESTERN HOCKEY LEAGUE',
            url: 'https://rinkstop.com/directory/junior/whl',
            sport: 'Ice Hockey',
            description: "Western Hockey League — Major Junior league in Western Canada and the U.S. Pacific Northwest, NHL draft pipeline.",
            foundingDate: '1966',
            sameAs: ['https://en.wikipedia.org/wiki/Western_Hockey_League'],
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
        <span style={{ color: '#A0A0A0' }}>WHL</span>

      <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.9375rem', lineHeight: 1.7, marginTop: '0.75rem' }}>
        The Western Hockey League was founded in 1966 and is one of three Major Junior leagues that make up the Canadian Hockey League — 
        the others being the Ontario Hockey League and the Quebec Major Junior Hockey League. 
        The WHL fields 22 teams across British Columbia, Alberta, Saskatchewan, Manitoba, and the U.S. Pacific Northwest (Washington and Oregon), 
        with one additional team in the U.S. Midwest. 
        Players in the WHL are aged 16–20 and compete at a level considered the top developmental rung before professional and international hockey. 
        The league is a primary NHL draft pipeline: over 40% of all NHL players selected in a typical draft year come from the WHL. 
        The WHL awards the Ed Chynoweth Trophy to its playoff champion, with the winner going on to compete in the Memorial Cup against the OHL and QMJHL champions.
      </p>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1 }}>
          WHL  --  WESTERN HOCKEY LEAGUE
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          Western Canada and US Pacific Northwest. 22 teams. Major CHL league and NHL draft pipeline.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
        {[
          { label: 'Junior Hockey', href: '/directory/junior' },
          { label: 'OHL', href: '/directory/junior/ohl' },
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

      <div style={{ background: 'linear-gradient(135deg, #8B0000 0%, #C8102E 100%)', border: '1px solid rgba(200,16,46,0.3)', borderRadius: '8px', padding: '1.5rem 2rem', marginBottom: '2rem' }}>
        <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem' }}>Western Hockey League  --  Major Junior</p>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.75rem', color: '#fff', letterSpacing: '0.04em' }}>22 TEAMS • BC, ALBERTA, SASK, MAN, WA</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', marginTop: '0.5rem' }}>Founded 1966 • Part of Canadian Hockey League (CHL)</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '2rem' }}>
        {[
          { label: 'Teams', value: '22' },
          { label: 'Age Range', value: '16-20' },
          { label: 'Founded', value: '1966' },
          { label: 'CHL Member', value: 'Yes' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '1rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: '0.25rem' }}>{s.label}</p>
            <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.25rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>ABOUT THE WHL</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', lineHeight: 1.8, marginBottom: '1rem' }}>
          The Western Hockey League is one of three Major Junior leagues in the Canadian Hockey League (CHL). With 22 teams across British Columbia, Alberta, Saskatchewan, Manitoba, and the U.S. state of Washington, the WHL covers a vast geographic footprint. It is a premier development league for hockey players aiming for NCAA hockey and the NHL. Notable alumni include many Hall of Famers and current NHL stars. The WHL season runs from September through March, ending with the WHL Championship and Memorial Cup.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link href="/directory/junior" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600 }}>All Junior Leagues →</Link>
          <Link href="/directory/college" style={{ color: '#C8102E', fontSize: '0.875rem', fontWeight: 600 }}>College Path →</Link>
        </div>
      </div>
    
      <LeagueTeams leagueId="46f49db9-e63d-407d-a99c-802f87576ab2" leagueSlug="whl" leagueName="WHL" />
    </main>
  );
}
