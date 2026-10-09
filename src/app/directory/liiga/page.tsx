import type { Metadata } from 'next';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';

// 2026-10-09: New special league page. Source: Wikipedia (Liiga), CHL history
// feature on chl.hockey, International Hockey Wiki, hockeydb.com. Champion
// list verified against hockeydb.com. Founding 1975 (SM-liiga), 2013 rename
// to Liiga. Tappara 14th title in 2025-26 — most in league history.

const LIIGA_LEAGUE_ID = '59d8bbfc-2010-424b-8022-22d5bb53faaa';

async function getLiigaTeamCount(): Promise<number> {
  try {
    const { count } = await supabaseAdmin
      .from('team_workspaces')
      .select('id', { count: 'exact', head: true })
      .eq('league_id', LIIGA_LEAGUE_ID)
      .eq('is_active', true);
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const teamCount = await getLiigaTeamCount();
  return {
    title: teamCount > 0
      ? `Liiga 2026-27 — ${teamCount} Teams, Standings & Schedule | RinkStop`
      : 'Liiga 2026-27 — Standings, Schedule & Teams | RinkStop',
    description: teamCount > 0
      ? `Liiga (Finnish Hockey League) 2026-27: ${teamCount} teams across Finland. Tappara the defending champion (14 titles). Live standings, schedule, scores, and rosters.`
      : 'Liiga (Finnish Hockey League) 2026-27. 16 teams across Finland. Standings, schedule, scores, and rosters. Tappara the defending champion.',
  };
}

export default async function LiigaPage() {
  const teamCount = await getLiigaTeamCount();
  const teamLabel = teamCount > 0 ? `${teamCount} TEAMS` : '16 TEAMS';

  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [{
            '@type': 'SportsOrganization',
            '@id': 'https://rinkstop.com/directory/liiga',
            name: 'Liiga',
            alternateName: 'SM-liiga (1975-2013)',
            url: 'https://rinkstop.com/directory/liiga',
            sport: 'Ice hockey',
            description: 'Liiga — the top professional ice hockey league of Finland, founded in 1975. Defending champion: Tappara (14 titles, the most in league history).',
            foundingDate: '1975',
            location: { '@type': 'Place', name: 'Finland' },
            sameAs: ['https://en.wikipedia.org/wiki/Liiga'],
          }, {
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'How many teams play in Liiga?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Liiga fields 16 teams across Finland for the 2026-27 season, with a 17th team (Jokerit Helsinki) returning to the league after a 12-year absence. The league expanded from 14 to 16 teams in 2024-25 when Kiekko-Espoo was promoted from Mestis.',
                },
              },
              {
                '@type': 'Question',
                name: 'Who has won the most Liiga championships?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Tappara Tampere holds the record with 14 SM-liiga/Liiga titles (most recent: 2025-26), the most of any Finnish club. TPS Turku is second with 10 league titles, followed by Kärpät Oulu (8), HIFK Helsinki (4), Ilves Tampere (1 in the SM-liiga era; 16 in the pre-1975 SM-sarja era combined), and Lukko Rauma (1).',
                },
              },
              {
                '@type': 'Question',
                name: 'When was Liiga founded?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Liiga was established in 1975 to replace the amateur-era SM-sarja (Suomen mestaruus, or "Finnish Championship"), which had been the top flight since 1928. The SM-liiga was Finland\'s first professional sports league. In 2013 the league dropped the SM prefix and rebranded as Liiga. The league traces its championship lineage back through the SM-sarja, with IFK Helsinki (HIFK) being the only original 1928 champion still playing in the top flight.',
                },
              },
              {
                '@type': 'Question',
                name: 'What is the format of the Liiga season?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The Liiga regular season runs from September to March, with each of the 16-17 teams playing 60 games (a home-and-home against every other team, plus conference scheduling). The top 8 teams qualify directly for the quarterfinals; the bottom 8 enter a best-of-five play-in round. The Liiga playoffs are best-of-seven through the quarterfinals, semifinals, and finals, with the champion crowned in April or May. The league is closed (no relegation), with promotion/relegation matches against Mestis champions determining whether the second-tier winner can apply for a Liiga license.',
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
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>Liiga</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1, fontFamily: '"Bebas Neue", sans-serif' }}>
          Liiga — Finnish Hockey League
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.95rem', marginTop: '0.5rem', maxWidth: '780px' }}>
          {teamLabel} across Finland. Founded 1975 as SM-liiga; renamed Liiga in 2013. Defending champion: Tappara Tampere (14th title, 2025-26).
        </p>
      </div>

      {/* Conference / division structure */}
      <section style={{ marginBottom: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
          {teamLabel} • LIIGA 2026-27
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1rem' }}>
          Liiga returns to a 17-team league in 2026-27 with the re-entry of Jokerit Helsinki — the Helsinki club had been a Liiga fixture from 1975 until 2014, when financial difficulties forced them out. The 17 teams are not split into formal conferences or divisions; Liiga uses a single-table regular season with the top 8 advancing to a direct quarterfinal round and the bottom 8 playing a best-of-five play-in.
        </p>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.6 }}>
          Major markets in the 2026-27 Liiga: Helsinki (HIFK, Jokerit), Tampere (Ilves, Tappara — the two clubs share Nokia Arena, the largest venue in Finland at 12,700), Turku (TPS), Oulu (Kärpät), and Lahti (Pelicans). The Nokia Arena derby between Ilves and Tappara is the league&apos;s marquee regular-season matchup, drawing 12,000+ for both home-and-away fixtures each year.
        </p>
      </section>

      {/* LIIGA HISTORY */}
      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>LIIGA HISTORY</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            Finnish hockey traces to a 1899 exhibition in Helsinki, but the organized national league — the SM-sarja — only began in 1928. The first champion was Viipurin Reipas; the only original-1928 club still playing in the top flight is HIFK Helsinki, founded 1897. The early decades were dominated by Tampere clubs: Ilves won nine SM-sarja titles between 1936 and 1952, including a four-and-a-half-year unbeaten run between 1945 and 1948, and the city of Tampere collected 17 championships between 1945 and 1966.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The SM-liiga was established in 1975 to replace the amateur-era SM-sarja, becoming Finland&apos;s first professional sports league. Kalervo Kummola was the first chief executive, serving until 1987. The new league introduced playoffs — a novelty in Finnish hockey at the time — and pooled gate receipts during the postseason to distribute as placement bonuses. The inaugural 1975-76 season had 10 teams; TPS Turku won the first SM-liiga title, sweeping Tappara 2-0 in the final.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The 1990s belonged to Jokerit Helsinki and TPS Turku. Jokerit, with Teemu Selänne in the lineup for part of the decade, and TPS, with Jere Lehtinen, Saku Koivu, and Miikka Kiprusoff, combined for 13 championships between 1988 and 2002. TPS was the dominant side of the era with eight titles, six of which came under head coach Hannu Jortikka. The two clubs developed a generation of players who went on to long NHL careers and won Olympic medals for Finland.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            Kärpät Oulu emerged as the dominant force of the 2000s, winning the SM-liiga championship in 2004, 2005, 2007, 2008, 2014, 2015, 2017, and 2018. The Oulu club returned to the top flight in 2000 after an 11-year absence in the lower divisions, and within four years was the league&apos;s premier franchise. Tappara Tampere then took over as the league&apos;s most successful modern club, winning in 2003, 2016, 2017, 2021, 2022, 2023, 2024, and 2026, including a run of four consecutive titles from 2021-22 through 2024-25.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The SM-liiga was renamed simply "Liiga" in 2013, dropping the "SM" prefix as part of a broader brand modernization. Jokerit Helsinki was granted a license to play in the KHL for the 2014-15 through 2019-20 seasons but returned to Finnish hockey at the second-tier Mestis level in 2020-21. Jokerit secured promotion and re-entered Liiga for the 2026-27 season, bringing the league to 17 clubs.
          </p>
          <p>
            The 2019-20 Liiga season was terminated on March 13, 2020 due to the COVID-19 pandemic, with no Finnish championship awarded. Tappara entered the 2025-26 season having won three consecutive championships and won the title in a four-game sweep over KooKoo Kouvola in the 2026 final, taking their record to 14 SM-liiga/Liiga titles — the most of any club in league history.
          </p>
        </div>
      </section>

      {/* HOW THE LIIGA WORKS */}
      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>HOW LIIGA WORKS</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            The Liiga regular season runs from September to March, with 17 teams each playing 60 games in 2026-27. The schedule is a home-and-home series against every other team, with additional intra-conference scheduling weighted by travel geography — a necessary concession in a country where road trips between Helsinki, Oulu, and Tampere can exceed 600 km. Three points are awarded for a regulation or overtime win, two for a shootout win, one for an overtime loss, and zero for a regulation loss.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The top 8 teams in the regular-season standings advance directly to the quarterfinals. Teams finishing 9th through 12th play a best-of-five play-in round, with the winners advancing to the quarterfinals. Teams finishing 13th through 16th are eliminated; 17th place plays a best-of-seven relegation series against the top Mestis finisher for the right to apply for a Liiga license. Since 2013-14, the promotion system is a license application rather than an automatic promotion — the Mestis champion can apply, and if granted the club enters Liiga after a one-year transition.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The Liiga playoffs are best-of-seven through every round, from quarterfinals (best-of-seven) through the semifinals and the Liiga finals. The final is played in April or May. The champion receives the Kanada-malja (the "Canada Bowl," named after a Finnish-Canadian ice hockey benefactor). Tappara is the most successful club in the SM-liiga/Liiga era, with 14 titles; the most successful Finnish club in the combined SM-sarja + SM-liiga + Liiga lineage is Ilves Tampere with 16 total championships, but the bulk of those pre-date the modern professional era.
          </p>
          <p>
            Liiga rosters are capped at 25 players for the standard playing roster, with a maximum of 5 import (non-Finnish) players. Finnish-league players have a long history of NHL transition — more than 200 Finnish-born players have appeared in NHL games, and the 2024-25 Liiga champion Lukko Rauma roster alone featured 7 players who went on to sign NHL contracts. The Champions Hockey League (CHL), a pan-European competition founded in 2008 and reformed in 2014-15, includes top Liiga clubs and gives Finnish teams regular matches against SHL, DEL, and Czech Extraliga opposition.
          </p>
        </div>
      </section>

      {/* Editorial footer */}
      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Editorial standards.</strong> By Arnel Larracas, Founder &amp; Editor-in-Chief, RinkStop. Last reviewed 2026-10-09.<br />
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Data sources.</strong> Team count from RinkStop team_workspaces table (live query, refreshed per request). Founded 1975, Tappara 14 championships, Jokerit 2014 KHL departure, COVID-19 2019-20 cancellation, Kiekko-Espoo 2024 expansion: Wikipedia (Liiga), CHL history feature on chl.hockey, hockeydb.com, International Hockey Wiki.<br />
          <span style={{ color: 'rgba(255,255,255,0.45)' }}><Link href="/editorial-policy" style={{ color: '#FFB81C' }}>Editorial policy</Link> · <Link href="/data-methodology" style={{ color: '#FFB81C' }}>Data methodology</Link> · <Link href="/corrections" style={{ color: '#FFB81C' }}>Report a correction</Link></span>
        </p>
      </section>
    </main>
  );
}
