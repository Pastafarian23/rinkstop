import type { Metadata } from 'next';
import Link from 'next/link';
import { getLatestSeason, getStandingsForSeason, getTodaysNhlGames, NhlMatch, NhlStanding } from '@/lib/nhl-data';
import { teamsByDivision, teamsByConference, findCanonicalTeam, NHL_TEAMS_CANONICAL } from '@/lib/nhl-teams-canonical';

export const revalidate = 300; // 5 min for today's games; 1 hour for standings via sub-cache

export const metadata: Metadata = {
  // 2026-09-03 Gap 1: rewrote title to 53 chars + added season year. Old "NHL Hub" was generic.
  title: 'NHL Hockey 2026-27 — Scores, Standings',
  description:
    'NHL 2026-27 season: live scores for all 32 teams, current standings, today\'s games, schedule, and complete team directory with rosters.',
};

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function TodaysGame({ g }: { g: NhlMatch }) {
  const isFinished = g.status.startsWith('Finished');
  const isLive = g.status === 'In progress' || g.status === 'InProgress';
  return (
    <Link href={`/directory/nhl/games/${new Date(g.date).toISOString().slice(0, 10)}-${g.home_team_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-vs-${g.away_team_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`} style={{ textDecoration: 'none' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr 60px',
        gap: '0.5rem',
        alignItems: 'center',
        padding: '0.6rem 0.75rem',
        background: 'var(--s2)',
        border: '1px solid var(--border)',
        borderRadius: '6px',
        marginBottom: '0.4rem',
      }}>
        <div style={{ textAlign: 'right' }}>
          <span style={{ color: '#fff', fontSize: '0.8125rem', fontWeight: 600 }}>{g.away_team_name}</span>
        </div>
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', fontWeight: 600, minWidth: 50 }}>
          {isFinished ? `${g.away_score}–${g.home_score}` : isLive ? `${g.away_score ?? 0}–${g.home_score ?? 0}` : fmtTime(g.date)}
        </div>
        <div>
          <span style={{ color: '#fff', fontSize: '0.8125rem', fontWeight: 600 }}>{g.home_team_name}</span>
        </div>
        <div style={{ textAlign: 'right', fontSize: '0.7rem', fontWeight: 600, color: isFinished ? 'rgba(255,255,255,0.35)' : isLive ? '#00d4ff' : 'rgba(0,212,255,0.7)' }}>
          {isFinished ? 'Final' : isLive ? 'LIVE' : ''}
        </div>
      </div>
    </Link>
  );
}

function StandingPreview({ rows, label, color }: { rows: NhlStanding[]; label: string; color: string }) {
  if (rows.length === 0) return null;
  return (
    <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
      <div style={{ padding: '0.6rem 0.875rem', borderBottom: '1px solid var(--border)', background: color + '20' }}>
        <span style={{ color, fontSize: '0.625rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
      </div>
      {rows.slice(0, 5).map(r => {
        const slug = findCanonicalTeam(r.team_name.toLowerCase().replace(/[^a-z0-9]+/g, '-'))?.slug;
        return (
          <Link key={r.id} href={slug ? `/directory/nhl/teams/${slug}` : '#'} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '24px 1fr 50px 50px',
              padding: '0.45rem 0.875rem',
              fontSize: '0.75rem',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
              alignItems: 'center',
            }}>
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>{r.rank}</span>
              <span style={{ color: '#fff', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.team_name.replace(' Hockey Club', '')}</span>
              <span style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>{r.wins}–{r.losses}–{r.overtime_losses}</span>
              <span style={{ textAlign: 'center', color: '#fff', fontWeight: 700 }}>{r.points}</span>
            </div>
          </Link>
        );
      })}
      <Link href="/directory/nhl/standings" style={{
        display: 'block',
        padding: '0.5rem 0.875rem',
        fontSize: '0.7rem',
        color: 'rgba(0,212,255,0.7)',
        textAlign: 'center',
        textDecoration: 'none',
      }}>
        Full Standings →
      </Link>
    </div>
  );
}

export default async function NHLHubPage() {
  // Fetch today's games + current season standings in parallel
  const [todaysGames, latestSeason, allStandings] = await Promise.all([
    getTodaysNhlGames(),
    getLatestSeason(),
    getLatestSeason().then((s): Promise<NhlStanding[]> => s ? getStandingsForSeason(s) : Promise.resolve([])),
  ]);

  // Group standings by division
  const atlantic = allStandings.filter(s => s.team_name.match(/Boston|Buffalo|Detroit|Florida|Montreal|Ottawa|Tampa|Toronto/i)).sort((a, b) => a.rank - b.rank);
  const metro = allStandings.filter(s => s.team_name.match(/Carolina|Columbus|New Jersey|Islanders|Rangers|Philadelphia|Pittsburgh|Washington/i)).sort((a, b) => a.rank - b.rank);
  const central = allStandings.filter(s => s.team_name.match(/Colorado|Dallas|Minnesota|Nashville|St\. Louis|Utah|Winnipeg|Chicago/i)).sort((a, b) => a.rank - b.rank);
  const pacific = allStandings.filter(s => s.team_name.match(/Anaheim|Calgary|Edmonton|Los Angeles|San Jose|Seattle|Vancouver|Vegas/i)).sort((a, b) => a.rank - b.rank);

  const today = new Date();
  const todayStr = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      {/* WS27 PR5m (2026-09-14): add SportsOrganization + FAQPage + BreadcrumbList schema.
          Previously this page had no JSON-LD at all. The KHL page (which has 3,543
          imp on 28d) and AHL page both have these schemas. Adding them here
          gives the NHL hub page the same content-understanding signal that
          other league pages already get. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'SportsOrganization',
                '@id': 'https://rinkstop.com/directory/nhl',
                name: 'National Hockey League',
                alternateName: 'NHL',
                url: 'https://rinkstop.com/directory/nhl',
                sport: 'Ice Hockey',
                description: 'National Hockey League (NHL) — premier professional ice hockey league of North America, 32 teams across the United States and Canada.',
                foundingDate: '1917',
                sameAs: ['https://en.wikipedia.org/wiki/National_Hockey_League'],
              },
              {
                '@type': 'BreadcrumbList',
                itemListElement: [
                  { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://rinkstop.com/' },
                  { '@type': 'ListItem', position: 2, name: 'Directory', item: 'https://rinkstop.com/directory' },
                  { '@type': 'ListItem', position: 3, name: 'NHL', item: 'https://rinkstop.com/directory/nhl' },
                ],
              },
              {
                '@type': 'FAQPage',
                mainEntity: [
                  {
                    '@type': 'Question',
                    name: 'How many teams are in the NHL?',
                    acceptedAnswer: {
                      '@type': 'Answer',
                      text: 'The NHL fields 32 teams across the United States and Canada, organized into 4 divisions: Atlantic, Metropolitan, Central, and Pacific. These divisions are grouped into 2 conferences (Eastern and Western).',
                    },
                  },
                  {
                    '@type': 'Question',
                    name: 'When does the 2026-27 NHL season start?',
                    acceptedAnswer: {
                      '@type': 'Answer',
                      text: 'The 2026-27 NHL regular season begins in early October 2026. The 2026-27 preseason runs from late September through early October. The Stanley Cup Playoffs begin in April 2027, with the Stanley Cup Final typically ending in June.',
                    },
                  },
                  {
                    '@type': 'Question',
                    name: 'What is the NHL championship trophy?',
                    acceptedAnswer: {
                      '@type': 'Answer',
                      text: 'The Stanley Cup — the oldest professional sports trophy in North America — has been awarded to the NHL playoff champion since 1893. The current format (best-of-7) has been in place since 1939.',
                    },
                  },
                  {
                    '@type': 'Question',
                    name: 'Where can I find NHL scores, standings, and schedules?',
                    acceptedAnswer: {
                      '@type': 'Answer',
                      text: 'Browse all 32 NHL team profiles on RinkStop, each with live scores, current standings, schedule, roster, and arena info. The hub page above shows today\'s games and current standings by division.',
                    },
                  },
                ],
              },
            ],
          }),
        }}
      />
      <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem' }}>
        <Link href="/" style={{ color: 'rgba(255,255,255,0.5)' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory" style={{ color: 'rgba(255,255,255,0.5)' }}>Directory</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: 'rgba(255,255,255,0.7)' }}>NHL</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1, margin: 0 }}>
          NHL HUB
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          32 teams across North America. {latestSeason ? `Season ${latestSeason} · ` : ''}{NHL_TEAMS_CANONICAL.length} active franchises.
        </p>
      </div>

      {/* Quick nav */}
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
        {[
          { label: 'Standings', href: '/directory/nhl/standings' },
          { label: 'Schedule', href: '/directory/nhl/schedule' },
          { label: 'Playoffs', href: '/directory/nhl/playoffs' },
          { label: 'Eastern', href: '/directory/nhl/eastern' },
          { label: 'Western', href: '/directory/nhl/western' },
          { label: 'Preseason', href: '/nhl/preseason/2026-27' },
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

      {/* Layout: today's games left, standings preview right */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Today's games */}
        <div>
          <h2 className="font-sport" style={{ fontSize: '1.1rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
            {todayStr.toUpperCase()} · {todaysGames.length} GAMES
          </h2>
          {todaysGames.length === 0 ? (
            <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.5rem', textAlign: 'center' }}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem' }}>No games scheduled for today.</p>
              <Link href="/directory/nhl/schedule" style={{ color: 'rgba(0,212,255,0.7)', fontSize: '0.8125rem', textDecoration: 'none' }}>
                View full schedule →
              </Link>
            </div>
          ) : (
            todaysGames.map(g => <TodaysGame key={g.id} g={g} />)
          )}
        </div>

        {/* Standings preview */}
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <h2 className="font-sport" style={{ fontSize: '1.1rem', color: '#fff', letterSpacing: '0.04em' }}>
              TOP 5 BY DIVISION
            </h2>
            <Link href="/directory/nhl/standings" style={{ color: 'rgba(0,212,255,0.7)', fontSize: '0.75rem', textDecoration: 'none' }}>
              Full →
            </Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <StandingPreview rows={atlantic} label="ATLANTIC" color="#041E42" />
            <StandingPreview rows={metro} label="METROPOLITAN" color="#1E3A5F" />
            <StandingPreview rows={central} label="CENTRAL" color="#C8102E" />
            <StandingPreview rows={pacific} label="PACIFIC" color="#1E5B9C" />
          </div>
        </div>
      </div>


      {/* Conferences & divisions (using canonical data) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {(['Atlantic', 'Metropolitan', 'Central', 'Pacific'] as const).map(div => {
          const teams = teamsByDivision(div);
          const conf = teams[0]?.conference;
          const slugMap: Record<string, string> = { Atlantic: 'atlantic', Metropolitan: 'metropolitan', Central: 'central', Pacific: 'pacific' };
          const colors: Record<string, string> = { Atlantic: '#041E42', Metropolitan: '#1E3A5F', Central: '#C8102E', Pacific: '#1E5B9C' };
          return (
            <Link key={div} href={`/directory/nhl/${slugMap[div]}`} style={{ textDecoration: 'none' }}>
              <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: colors[div] }}>{div} · {conf}</span>
                </div>
                <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.125rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>{div} Division</h3>
                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
                  {teams.map(t => t.city).join(' · ')}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* NHL HISTORY */}
      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>NHL HISTORY</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            The National Hockey League was founded on November 26, 1917, in Montreal, as a successor to the National Hockey Association (NHA, 1909-17). The NHA&apos;s owner-operators — including the owners of the Montreal Canadiens, Montreal Wanderers, Ottawa Senators, Quebec Bulldogs, and Toronto Arenas — incorporated the NHL with the Canadiens, Ottawa Senators, and the new Toronto Arenas as charter members. The Montreal Wanderers joined a day later, then disbanded mid-season after their arena burned down. The Quebec Bulldogs were unable to participate in the inaugural 1917-18 season and replaced mid-season by the Toronto Arenas.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The NHL was a Canadian-only league for its first seven seasons, with the Toronto Arenas/St Patricks (renamed in 1919, rebranded as the Maple Leafs in 1927), Montreal Canadiens, Ottawa Senators, and the Hamilton Tigers and Quebec Bulldogs as the original members. The Boston Bruins became the first American franchise in 1924, beginning the league&apos;s expansion into the United States. By 1926, the NHL had 10 teams (split between the Canadian Division and the American Division) and would consolidate in the early 1930s — the so-called &quot;Original Six era&quot; saw the league&apos;s six surviving franchises (Boston, Chicago, Detroit, Montreal, New York Rangers, Toronto) play without contraction or expansion from 1942-43 through 1966-67.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The 1967 expansion doubled the NHL&apos;s size from 6 to 12 teams, adding the Los Angeles Kings, Minnesota North Stars, Oakland Seals, Philadelphia Flyers, Pittsburgh Penguins, and St. Louis Blues. Two more expansions in 1970 and 1972 brought the league to 16 teams. The 1979 merger with the World Hockey Association (WHA) added four former WHA teams: Edmonton Oilers, Hartford Whalers (now Carolina Hurricanes), Quebec Nordiques (now Colorado Avalanche), and Winnipeg Jets (now Arizona Coyotes — and via 2011 relocation, the current Winnipeg Jets). The NHL reached 21 teams in 1979, 22 in 1991-92 (San Jose Sharks), 26 in 1993-94 (Ottawa Senators + Tampa Bay Lightning), and 30 in 2000-01 (Columbus Blue Jackets + Minnesota Wild). The Vegas Golden Knights (2017) and Seattle Kraken (2021) brought the league to 32 teams.
          </p>
          <p>
            The Stanley Cup is the oldest professional sports trophy in North America, first awarded in 1893 to the Montreal Hockey Club of the AHAC (Amateur Hockey Association of Canada). The Cup has been awarded to the NHL playoff champion since 1926-27, with the modern best-of-7 playoff format adopted in 1939. The Montreal Canadiens hold the record with 24 Stanley Cup championships, followed by the Toronto Maple Leafs (13), Detroit Red Wings (11), and Boston Bruins (6). The Edmonton Oilers (5), Pittsburgh Penguins (5), and Chicago Blackhawks (6) round out the most successful modern-era franchises.
          </p>
        </div>
      </section>

      {/* HOW THE NHL WORKS */}
      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>HOW THE NHL WORKS</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            The NHL regular season runs from early October to mid-April, with each of the 32 teams playing 82 games. The 32 teams are organized into 4 divisions (Atlantic, Metropolitan, Central, Pacific) of 8 teams each, with 2 conferences (Eastern and Western). The schedule includes intra-division games (most frequent), inter-division games within each conference, and inter-conference games. Two points are awarded for a win (any kind), one for an overtime or shootout loss, and zero for a regulation loss.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The top 3 teams in each division qualify directly for the Stanley Cup Playoffs. Two additional wild-card spots are awarded to the teams with the next-highest point totals in each conference, regardless of division. The first round is a divisional matchup of the 1st-place team against the wild-card; the second and third rounds are divisional playoffs, with the conference finals pitting the two surviving divisional champions against each other. All four rounds are best-of-7. The Stanley Cup Final is typically played in June, with the series alternating home-ice advantage each year between the Eastern and Western Conference champions.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The NHL salary cap for 2025-26 is $88 million USD per team, with a $4 million performance bonus cushion. The cap was introduced in 2005-06 following the 2004-05 lockout and is set annually based on league revenue. Each team&apos;s roster is capped at 23 players for the standard playing roster (plus unlimited reserve), with a minimum payroll of approximately $61 million. The Entry Draft is held annually in late June, with the order determined by a draft lottery for non-playoff teams.
          </p>
          <p>
            NHL games are broadcast in the US on ESPN and TNT (regular season) and ABC (Stanley Cup Final), in Canada on Sportsnet and TVA Sports, and internationally through NHL.TV (streaming) and various regional partners. The NHL&apos;s 32 franchises operate as independent businesses under the league umbrella, with the Commissioner (currently Gary Bettman, since 1993) overseeing league-wide operations. The NHL&apos;s 32 arenas range from Madison Square Garden (capacity 18,006) to smaller-market venues of around 17,000, with the league regularly drawing 20,000+ per game across the regular season and playoffs.
          </p>
        </div>
      </section>

      {/* Editorial footer */}
      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Editorial standards.</strong> By Arnel Larracas, Founder &amp; Editor-in-Chief, RinkStop. Last reviewed 2026-10-09.<br />
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Data sources.</strong> Founding 1917, Original Six era 1942-67, 1967 expansion, 1979 WHA merger, Stanley Cup 24 Canadiens titles, salary cap 88M: Wikipedia (National Hockey League), nhl.com, Hockey Reference.<br />
          <span style={{ color: 'rgba(255,255,255,0.45)' }}><Link href="/editorial-policy" style={{ color: '#FFB81C' }}>Editorial policy</Link> · <Link href="/data-methodology" style={{ color: '#FFB81C' }}>Data methodology</Link> · <Link href="/corrections" style={{ color: '#FFB81C' }}>Report a correction</Link></span>
        </p>
      </section>

      {/* Ticketmaster ad */}
    </main>
  );
}
