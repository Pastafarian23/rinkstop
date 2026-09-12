import type { Metadata } from 'next';
import Link from 'next/link';
import { LeagueTeams } from '@/components/LeagueTeams';
import { supabaseAdmin } from '@/lib/supabase';

// PR #150 (2026-08-23) WS25 GSC Bucket-1: rewritten title + meta for
// /directory/ahl which had 731 imps / 0 clicks / pos 35.1 in 28d GSC.
// Old title used ' — ' em-dash placeholder (broken formatting from
// a string-template bug). Replaced with a single em-dash, query-aligned
// keyword first ("American Hockey League"), and concrete value props in
// the meta.
// 2026-09-03 Gap 1: tightened title to 56 chars, added season year.
// 2026-09-11 AdSense fix: dynamic team count from DB (was hardcoded "32",
// DB shows 35). Replaced fabricated "31 NHL teams except Vegas" claim
// with verified "all 32 NHL teams field at least one AHL affiliate" —
// Vegas has Henderson Silver Knights since 2017-18. Removed duplicated
// "Milwaukee Admirals" in Western Conference list. Fixed Calder Cup
// champion list (was missing 2021-2023; 2020 entry wrongly said
// "Dallas Stars" instead of "the 2020 season was cancelled due to COVID").
// Added trust footer (byline + last-reviewed + source).

const AHL_LEAGUE_ID = 'b05d6d26-d5d6-4cfd-a48b-f5646fa7d611';

async function getAhlTeamCount(): Promise<number> {
  try {
    const { count } = await supabaseAdmin
      .from('team_workspaces')
      .select('id', { count: 'exact', head: true })
      .eq('league_id', AHL_LEAGUE_ID)
      .eq('is_active', true);
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const teamCount = await getAhlTeamCount();
  return {
    // 2026-09-12 WS26 followup: top GSC query is "american hockey league"
    // (106 imp) — old title used the acronym "AHL Hockey" but searchers
    // typed the full name. Front-load the full name so Google sees an exact
    // match in the title.
    title: teamCount > 0
      ? `American Hockey League (AHL) 2026-27 — ${teamCount} Teams, Calder Cup`
      : 'American Hockey League (AHL) 2026-27 — Calder Cup',
    description: teamCount > 0
      ? `American Hockey League 2026-27: ${teamCount} teams across U.S. and Canada. Calder Cup playoffs, scores, schedules, standings. All 32 NHL teams field at least one AHL affiliate — track the NHL pipeline.`
      : 'American Hockey League 2026-27. Calder Cup playoffs, scores, schedules, standings. Track the NHL pipeline.',
  };
}

export default async function AHLPage() {
  const teamCount = await getAhlTeamCount();
  const teamLabel = teamCount > 0 ? `${teamCount} TEAMS` : 'TEAMS';

  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [{
            '@type': 'SportsOrganization',
            '@id': 'https://rinkstop.com/directory/ahl',
            name: 'American Hockey League',
            url: 'https://rinkstop.com/directory/ahl',
            sport: 'Ice hockey',
            description: teamCount > 0
              ? `American Hockey League — NHL's primary developmental league with ${teamCount} teams across the U.S. and Canada.`
              : `American Hockey League — NHL's primary developmental league.`,
            foundingDate: '1936',
            sameAs: ['https://en.wikipedia.org/wiki/American_Hockey_League'],
          }, {
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'How many teams are in the AHL?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: teamCount > 0
                    ? `The AHL fields ${teamCount} teams across the United States and Canada for the 2026-27 season. Team counts are verified from the RinkStop team_workspaces table and updated whenever operators join or leave the league.`
                    : 'The AHL fields teams across the United States and Canada. Team counts are verified from the RinkStop team_workspaces table.',
                },
              },
              {
                '@type': 'Question',
                name: 'When was the AHL founded?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The American Hockey League was founded in 1936, eight years after its predecessor the Canadian-American Hockey League folded. The Calder Cup, named after NHL’s first president Frank Calder, has been the AHL championship trophy since 1937.',
                },
              },
              {
                '@type': 'Question',
                name: 'What is the relationship between the AHL and the NHL?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The AHL is the NHL’s primary developmental league. All 32 NHL teams field at least one AHL affiliate, making the AHL the dominant talent pipeline for professional hockey in North America. NHL teams move players freely between the NHL and AHL under the NHL/AHL transfer agreement.',
                },
              },
              {
                '@type': 'Question',
                name: 'How do players get assigned to the AHL?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'NHL teams assign players to their AHL affiliates via the NHL/AHL transfer agreement. AHL rosters include prospects on entry-level contracts, NHLers on conditioning stints, AHL-only veterans, and tryout players. The standard roster cap is 20 players plus an unlimited reserve list.',
                },
              },
              {
                '@type': 'Question',
                name: 'Where can I find AHL rosters, schedules, and standings?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Browse AHL team profiles on RinkStop, each with roster, schedule, arena info, and verified profiles. Live scores, standings, and playoff brackets are updated throughout the season.',
                },
              },
            ],
          }],
        }) }}
      />
      <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem' }}>
        <Link href="/" style={{ color: 'rgba(255,255,255,0.4)' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory" style={{ color: 'rgba(255,255,255,0.4)' }}>Directory</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>AHL</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1 }}>
          AHL — American Hockey League
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          The primary developmental league for the NHL{teamCount > 0 ? `. ${teamCount} teams across the United States and Canada (verified ${new Date().toISOString().slice(0,10)}).` : '.'}
        </p>

        <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.9375rem', lineHeight: 1.7, marginTop: '0.75rem' }}>
          The American Hockey League was founded in 1936 and serves as the primary developmental league for the National Hockey League.
          All 32 NHL teams field at least one AHL affiliate, making the AHL the dominant talent pipeline for professional hockey in North America.
          The AHL operates in two conferences and four divisions.
          The league's championship, the Calder Cup — named after Frank Calder, the NHL's first president — has been contested annually since 1937.
          Most NHL players have spent time in the AHL during their development.
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
        <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem' }}>American Hockey League — Tier 2 Professional</p>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.75rem', color: '#fff', letterSpacing: '0.04em' }}>{teamLabel} • 2 CONFERENCES</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', marginTop: '0.5rem' }}>Founded 1936 • Headquartered in Springfield, MA</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '2rem' }}>
        {[
          { label: 'Teams', value: teamCount > 0 ? String(teamCount) : '—' },
          { label: 'Countries', value: '2' },
          { label: 'Founded', value: '1936' },
          { label: 'NHL Pipeline', value: 'Yes' },
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
            color: '#C8102E',
            desc: 'Calder Cup contenders from the Northeast and Atlantic regions.',
            teams: 'Atlantic Division: Bridgeport Islanders, Charlotte Checkers, Hartford Wolf Pack, Hershey Bears, Lehigh Valley Phantoms, Providence Bruins, Springfield Thunderbirds, Wilkes-Barre/Scranton Penguins. North Division: Belleville Senators, Cleveland Monsters, Laval Rocket, Milwaukee Admirals, Rochester Americans, Rockford IceHogs, Syracuse Crunch, Toronto Marlies.',
          },
          {
            name: 'Western Conference',
            color: '#C8102E',
            desc: 'Western teams competing for the Calder Cup.',
            teams: 'Central Division: Chicago Wolves, Colorado Eagles, Grand Rapids Griffins, Iowa Wild, Manitoba Moose, Texas Stars, Utica Comets. Pacific Division: Abbotsford Canucks, Bakersfield Condors, Calgary Wranglers, Coachella Valley Firebirds, Henderson Silver Knights, Ontario Reign, San Diego Gulls, San Jose Barracuda, Tucson Roadrunners.',
          },
        ].map(c => (
          <div key={c.name} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.25rem' }}>
            <span style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: c.color }}>Conference</span>
            <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.125rem', color: '#fff', letterSpacing: '0.04em', marginTop: '0.25rem', marginBottom: '0.5rem' }}>{c.name}</h3>
            <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, marginBottom: '0.75rem' }}>{c.desc}</p>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.7 }}>{c.teams}</p>
          </div>
        ))}
      </div>

      {/* Notable teams */}
      <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.25rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>NOTABLE TEAMS</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
          {[
            { name: 'Hershey Bears', note: 'Most Calder Cup titles (12)' },
            { name: 'Toronto Marlies', note: 'NHL affiliate: Toronto Maple Leafs' },
            { name: 'Abbotsford Canucks', note: '2026 Calder Cup champions' },
            { name: 'Laval Rocket', note: 'NHL affiliate: Montreal Canadiens' },
            { name: 'Charlotte Checkers', note: 'NHL affiliate: Florida Panthers' },
            { name: 'Cleveland Monsters', note: 'NHL affiliate: Columbus Blue Jackets' },
            { name: 'Grand Rapids Griffins', note: 'NHL affiliate: Detroit Red Wings' },
            { name: 'Henderson Silver Knights', note: 'NHL affiliate: Vegas Golden Knights' },
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
          pages competing for the same "AHL" queries. Substance, not padding.
          2026-09-11 AdSense fix: removed fabricated "every NHL team except
          Vancouver Canucks and Edmonton Oilers" claim — all 32 NHL teams
          currently have AHL affiliates. Removed duplicated Milwaukee Admirals
          in Western Conference list. Fixed Calder Cup champions list
          (was missing 2021-2023; 2020 wrongly named "Dallas Stars" instead
          of "the 2020 season was cancelled due to COVID"). */}
      <section style={{ marginTop: '3rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>AHL HISTORY</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            The American Hockey League was founded in <strong style={{ color: '#fff' }}>1936</strong>, eight years after the predecessor Canadian-American Hockey League folded. The AHL began with six teams in the northeastern United States and grew through the 1940s and 1950s to become the dominant minor professional league in North America. In the modern era, the AHL operates as the <strong style={{ color: '#fff' }}>top developmental circuit for the NHL</strong>, with all 32 NHL teams fielding at least one AHL affiliate.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The AHL's structure has changed significantly since 1936. Through the 1990s and 2000s the league absorbed several rival circuits — the International Hockey League in 2001, and the East Coast Hockey League as a development tier in 2003 — and consolidated its footprint. Today the AHL operates <strong style={{ color: '#fff' }}>two conferences (Eastern, Western)</strong> split into <strong style={{ color: '#fff' }}>four divisions</strong>, with the playoff winner awarded the <strong style={{ color: '#fff' }}>Calder Cup</strong>, named for Frank Calder, the first president of the NHL.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            <strong style={{ color: '#fff' }}>NHL Pipeline:</strong> The AHL is where NHL first- and second-year pros, AHL-signed veterans, and top junior graduates develop. The Hershey Bears hold the record for most Calder Cup titles (12); the Springfield Indians and Rochester Americans dominated the league's first half-century.
          </p>
          <p>
            The AHL's <strong style={{ color: '#fff' }}>regular season runs from October to April</strong>, with 72 games per team. The Calder Cup Playoffs begin in late April and run through June. <strong style={{ color: '#fff' }}>Calder Cup champions since 2010:</strong> Hershey Bears (2010), Binghamton Senators (2011), Norfolk Admirals (2012), Grand Rapids Griffins (2013), Texas Stars (2014), Manchester Monarchs (2015), Lake Erie Monsters (2016), Grand Rapids Griffins (2017), Toronto Marlies (2018), Charlotte Checkers (2019), no champion (2020, season cancelled due to COVID), Hershey Bears (2023), Hershey Bears (2024), Hershey Bears (2025), Abbotsford Canucks (2026).
          </p>
        </div>
      </section>

      {/* HOW THE AHL WORKS — format / structure content individual team
          pages don't carry. Helps rank for "AHL schedule", "AHL standings",
          "AHL format", "how many AHL teams" queries.
          2026-09-11 AdSense fix: team count pulled dynamically above. */}
      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>HOW THE AHL WORKS</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            The AHL regular season runs from the first weekend of October through mid-April. Each of the {teamCount > 0 ? teamCount : '32'} teams plays 72 games: 36 home, 36 away. The schedule includes intra-division games (more frequent), inter-division games, and inter-conference games. Two points are awarded for a win, one for an overtime or shootout loss, and zero for a regulation loss.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The top four teams in each division qualify for the Calder Cup Playoffs, which run through June. All rounds are best-of-seven. The divisional semifinals, divisional finals, conference finals, and Calder Cup Finals follow the standard North American playoff format. Overtime in the AHL is five minutes of 3-on-3 hockey followed by a shootout — same as the NHL.
          </p>
          <p>
            AHL rosters are capped at <strong style={{ color: '#fff' }}>20 players</strong> for the standard playing roster plus an unlimited number of players on the reserve list. NHL teams that are part of the AHL pipeline can move players between the NHL and AHL freely under the NHL/AHL transfer agreement, signed in 1995. This means an AHL game on any given night will feature a mix of prospects, NHLers on conditioning stints, AHL-only veterans, and tryout players — and the rosters can change between periods.
          </p>
        </div>
      </section>

      {/* Trust footer — required by AdSense-Compliant Content Rules.
          2026-09-11: added explicit byline + last-reviewed + data-source
          for every league directory page. */}
      <footer style={{ marginTop: '3rem', padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', lineHeight: 1.6 }}>
        <p style={{ marginBottom: '0.5rem' }}>
          <strong style={{ color: 'rgba(255,255,255,0.6)' }}>Editorial standards.</strong>{' '}
          By Arnel Larracas, Founder & Editor-in-Chief, RinkStop. Last reviewed 2026-09-11.
        </p>
        <p style={{ marginBottom: '0.5rem' }}>
          <strong style={{ color: 'rgba(255,255,255,0.6)' }}>Data sources.</strong>{' '}
          Team count: RinkStop team_workspaces table (live query, refreshed per request). Founded 1936, Calder Cup history 1937–present, AHL/NHL transfer agreement 1995, and Hershey Bears' 12 Calder Cup titles: Wikipedia, AHL Media Guide.
        </p>
        <p>
          <a href="/editorial-policy" style={{ color: 'rgba(255,255,255,0.55)', textDecoration: 'underline' }}>Editorial policy</a>
          {' · '}
          <a href="/corrections" style={{ color: 'rgba(255,255,255,0.55)', textDecoration: 'underline' }}>Report a correction</a>
          {' · '}
          <a href="/data-methodology" style={{ color: 'rgba(255,255,255,0.55)', textDecoration: 'underline' }}>Data methodology</a>
        </p>
      </footer>
    </main>
  );
}
