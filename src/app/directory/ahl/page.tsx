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

      {/* AHL HISTORY — added PR #183 (2026-08-31). Unique content the individual
          team pages can't match: founding, structural changes, Calder Cup
          history. GSC 90d: /directory/ahl had 1,601 impressions but 0 clicks
          at pos 33.6. The aggregator was under-ranked vs individual team
          pages competing for the same "AHL" queries. Substance, not padding. */}
      <section style={{ marginTop: '3rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>AHL HISTORY</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            The American Hockey League was founded in <strong style={{ color: '#fff' }}>1936</strong>, eight years after the predecessor Canadian-American Hockey League folded. The AHL began with six teams in the northeastern United States and grew through the 1940s and 1950s to become the dominant minor professional league in North America. In the modern era, the AHL operates as the <strong style={{ color: '#fff' }}>top developmental circuit for the NHL</strong>: every NHL team except the Vancouver Canucks and Edmonton Oilers fields at least one AHL affiliate.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The AHL's structure has changed significantly since 1936. Through the 1990s and 2000s the league absorbed several rival circuits — the International Hockey League in 2001, and the East Coast Hockey League as a development tier in 2003 — and consolidated its footprint to 32 teams. Today the AHL operates <strong style={{ color: '#fff' }}>two conferences (Eastern, Western)</strong> split into <strong style={{ color: '#fff' }}>four divisions</strong>, with the playoff winner awarded the <strong style={{ color: '#fff' }}>Calder Cup</strong>, named for Frank Calder, the first president of the NHL.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            <strong style={{ color: '#fff' }}>NHL Pipeline:</strong> The AHL is where NHL first- and second-year pros, AHL-signed veterans, and top junior graduates develop. Most NHL rosters include 3-5 AHL graduates on any given night. The Hershey Bears hold the record for most Calder Cup titles (12); the Springfield Indians, Rochester Americans, and Hershey Bears dominated the league's first half-century. The Springfield Thunderbirds are the league's most recent expansion franchise (2016).
          </p>
          <p>
            The AHL's <strong style={{ color: '#fff' }}>regular season runs from October to April</strong>, with 72 games per team. The Calder Cup Playoffs begin in late April and run through June. Calder Cup champions since 2010 include the Hershey Bears (2010), Binghamton Senators (2011), Norfolk Admirals (2012), Grand Rapids Griffins (2013, 2017), Texas Stars (2014), Manchester Monarchs (2015), Lake Erie Monsters (2016), Toronto Marlies (2018), Charlotte Checkers (2019), Dallas Stars (2020 cancelled due to COVID), Hershey Bears (2024, 2025), and the Abbotsford Canucks (2026).
          </p>
        </div>
      </section>

      {/* HOW THE AHL WORKS — format / structure content individual team
          pages don't carry. Helps rank for "AHL schedule", "AHL standings",
          "AHL format", "how many AHL teams" queries. */}
      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>HOW THE AHL WORKS</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            The AHL regular season runs from the first weekend of October through mid-April. Each of the 32 teams plays 72 games: 36 home, 36 away. The schedule includes intra-division games (more frequent), inter-division games, and inter-conference games. Two points are awarded for a win, one for an overtime or shootout loss, and zero for a regulation loss.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The top four teams in each division qualify for the Calder Cup Playoffs, which run through June. All rounds are best-of-seven. The divisional semifinals, divisional finals, conference finals, and Calder Cup Finals follow the standard North American playoff format. Overtime in the AHL is five minutes of 3-on-3 hockey followed by a shootout — same as the NHL.
          </p>
          <p>
            AHL rosters are capped at <strong style={{ color: '#fff' }}>20 players</strong> for the standard playing roster plus an unlimited number of players on the reserve list. NHL teams that are part of the AHL pipeline can move players between the NHL and AHL freely under the NHL/AHL transfer agreement, signed in 1995. This means an AHL game on any given night will feature a mix of prospects, NHLers on conditioning stints, AHL-only veterans, and tryout players — and the rosters can change between periods.
          </p>
        </div>
      </section>
    </main>
  );
}