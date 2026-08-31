import type { Metadata } from 'next';
import Link from 'next/link';
import { LeagueTeams } from '@/components/LeagueTeams';

export const metadata: Metadata = {
  // PR #150 (2026-08-23) WS25 GSC Bucket-1: rewritten title + meta for
  // /directory/ahl which had 731 imps / 0 clicks / pos 35.1 in 28d GSC.
  // Old title used '  --  ' em-dash placeholder (broken formatting from
  // a string-template bug). Replaced with a single em-dash, query-aligned
  // keyword first ("American Hockey League"), and concrete value props in
  // the meta (32 teams, Calder Cup, NHL pipeline, all 31 NHL affiliates).
  title: 'American Hockey League — AHL Teams, Schedule & Standings',
  description: 'Complete AHL coverage: 32 teams across the U.S. and Canada, Calder Cup playoffs, scores, schedules, and standings. Every NHL team fields at least one AHL affiliate — track the NHL pipeline on RinkStop.',
};

export default function AHLPage() {
  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [{
            '@type': 'SportsOrganization',
            '@id': 'https://rinkstop.com/directory/ahl',
            name: 'AMERICAN HOCKEY LEAGUE',
            url: 'https://rinkstop.com/directory/ahl',
            sport: 'Ice Hockey',
            description: "American Hockey League — NHL's primary developmental league with 32 teams across the U.S. and Canada.",
            foundingDate: '1936',
            sameAs: ['https://en.wikipedia.org/wiki/American_Hockey_League'],
          }],
        }) }}
      />
      <nav style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>
        <Link href="/" style={{ color: '#555' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory" style={{ color: '#555' }}>Directory</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#A0A0A0' }}>AHL</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1 }}>
          AHL  --  AMERICAN HOCKEY LEAGUE
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', marginTop: '0.5rem' }}>

      <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.9375rem', lineHeight: 1.7, marginTop: '0.75rem' }}>
        The American Hockey League was founded in 1936 and serves as the primary developmental league for the National Hockey League. 
        All 31 NHL teams except the Vegas Golden Knights maintain at least one AHL affiliate, making the league the dominant talent pipeline for professional hockey in North America. 
        The AHL operates 32 teams across two conferences and four divisions, spanning from Bakersfield, California to Springfield, Massachusetts, 
        with a geographic footprint that covers every major NHL market. 
        Players typically advance to the AHL after four seasons of major junior, college, or European professional experience. 
        The league's championship, the Calder Cup — named after Frank Calder, the NHL's first president — has been contested annually since 1937. 
        Former AHL players who reached the NHL include Connor Hellebuyck, Victor Hedman, Jonathan Quick, and more than 95% of all players who have ever played a game in the NHL.
      </p>
          The primary developmental league for the NHL. 32 teams across the United States and Canada.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
        {[
          { label: 'NHL', href: '/directory/nhl' },
          { label: 'AHL Playoffs', href: '/directory/ahl/playoffs' },
          { label: 'PWHL', href: '/directory/pwhl' },
          { label: 'All Leagues', href: '/directory/leagues' },
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

      {/* League info */}
      <div style={{ background: 'linear-gradient(135deg, #C8102E 0%, #8B0000 100%)', border: '1px solid rgba(200,16,46,0.3)', borderRadius: '8px', padding: '1.5rem 2rem', marginBottom: '2rem' }}>
        <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem' }}>American Hockey League  --  Tier 2 Professional</p>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.75rem', color: '#fff', letterSpacing: '0.04em' }}>32 TEAMS • 2 CONFERENCES</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', marginTop: '0.5rem' }}>Founded 1936 • Headquartered in Springfield, MA</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '2rem' }}>
        {[
          { label: 'Teams', value: '32' },
          { label: 'Countries', value: '2' },
          { label: 'Founded', value: '1936' },
          { label: 'NHL Affiliate', value: 'Yes' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '1rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: '0.25rem' }}>{s.label}</p>
            <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Conferences */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          {
            name: 'Eastern Conference',
            color: '#041E42',
            desc: 'Calder Cup contenders from the Northeast and Atlantic regions.',
            teams: 'Milwaukee Admirals, Cleveland Monsters, Toronto Marlies, Laval Rocket, Rochester Americans, Belleville Sens, Hartford Wolf Pack, Springfield Thunderbirds, Charlotte Checkers, Wilkes-Barre/Scranton Penguins',
          },
          {
            name: 'Western Conference',
            color: '#C8102E',
            desc: 'Western teams competing for the Calder Cup.',
            teams: 'Chicago Wolves, Colorado Eagles, Grand Rapids Griffins, Iowa Wild, Manitoba Moose, Milwaukee Admirals, Ontario Reign, PDX, Rockford IceHogs, San Jose Barracuda, San Diego Gulls, Tucson Roadrunners',
          },
        ].map(c => (
          <div key={c.name} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.25rem' }}>
            <span style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: c.color }}>Conference</span>
            <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.125rem', color: '#fff', letterSpacing: '0.04em', marginTop: '0.25rem', marginBottom: '0.5rem' }}>{c.name}</h3>
            <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, marginBottom: '0.75rem' }}>{c.desc}</p>
            <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.35)', lineHeight: 1.7 }}>{c.teams}</p>
          </div>
        ))}
      </div>

      {/* Notable teams */}
      <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.25rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>NOTABLE TEAMS</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
          {[
            { name: 'Milwaukee Admirals', note: 'NHL: Nashville Predators' },
            { name: 'Toronto Marlies', note: 'NHL: Toronto Maple Leafs' },
            { name: 'Laval Rocket', note: 'NHL: Montreal Canadiens' },
            { name: 'Charlotte Checkers', note: 'NHL: Florida Panthers' },
            { name: 'Cleveland Monsters', note: 'NHL: Columbus Blue Jackets' },
            { name: 'Grand Rapids Griffins', note: 'NHL: Detroit Red Wings' },
          ].map(t => (
            <div key={t.name} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '6px', padding: '1rem' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>{t.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>{t.note}</div>
            </div>
          ))}
        </div>
      </div>
    
      <LeagueTeams leagueId="b05d6d26-d5d6-4cfd-a48b-f5646fa7d611" leagueSlug="ahl" leagueName="AHL" />
    </main>
  );
}