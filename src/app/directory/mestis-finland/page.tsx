import type { Metadata } from 'next';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';

// 2026-10-09: New special league page. Source: Wikipedia (Mestis),
// hockeydb.com. 9 teams in 2026-27. Founded 2000 (replaced I-Divisioona).
// Finland's second tier. Jukurit 7 titles (most). Jokerit promoted 2026.

const MESTIS_LEAGUE_ID = 'a592159d-a75c-457f-803a-d60d7fc6f669';

async function getMestisTeamCount(): Promise<number> {
  try {
    const { count } = await supabaseAdmin
      .from('team_workspaces')
      .select('id', { count: 'exact', head: true })
      .eq('league_id', MESTIS_LEAGUE_ID)
      .eq('is_active', true);
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const teamCount = await getMestisTeamCount();
  return {
    title: teamCount > 0
      ? `Mestis 2026-27 — ${teamCount} Teams, Standings & Schedule | RinkStop`
      : 'Mestis 2026-27 — Standings, Schedule & Teams',
    description: teamCount > 0
      ? `Mestis 2026-27: ${teamCount} teams across Finland. The second tier of Finnish ice hockey, founded 2000. Jokerit recently promoted to Liiga. Jukurit 7 Mestis titles.`
      : 'Mestis 2026-27: 9 teams across Finland. The second tier of Finnish ice hockey, founded 2000. Jokerit recently promoted to Liiga.',
  };
}

export default async function MestisPage() {
  const teamCount = await getMestisTeamCount();
  const teamLabel = teamCount > 0 ? `${teamCount} TEAMS` : '9 TEAMS';

  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [{
            '@type': 'SportsOrganization',
            '@id': 'https://rinkstop.com/directory/mestis-finland',
            name: 'Mestis',
            alternateName: 'Finland second-tier hockey (Mestaruussarja)',
            url: 'https://rinkstop.com/directory/mestis-finland',
            sport: 'Ice hockey',
            description: 'Mestis — the second-highest men\'s ice hockey league in Finland, founded 2000 to replace the I-Divisioona. 9 teams for 2026-27. Jokerit Helsinki won the 2024-25 and 2025-26 titles and was promoted to the Liiga. Jukurit hold the record with 7 Mestis championships.',
            foundingDate: '2000',
            location: { '@type': 'Place', name: 'Finland' },
            sameAs: ['https://en.wikipedia.org/wiki/Mestis'],
          }, {
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'How many teams play in Mestis?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Mestis fields 9 teams for 2026-27. The 9 teams include Hermes (Kokkola), IPK (Iisalmi), JoKP (Joensuu), Ketterä (Imatra), KeuPa HT (Keuruu), Kiekko-Vantaa (Vantaa), RoKi (Rovaniemi), TUTO Hockey (Turku), and Pyry Hockey (Hämeenlinna). Jokerit was promoted to the Liiga for 2026-27 after winning the 2024-25 and 2025-26 Mestis titles.',
                },
              },
              {
                '@type': 'Question',
                name: 'When was Mestis founded?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Mestis was established by the Finnish Ice Hockey Association in 2000 to replace the I-Divisioona (First Division). The inaugural 2000-01 season featured 12 teams. Mestis operates as an open league with promotion and relegation to and from the SM-liiga (now Liiga) and Suomi-sarja (third tier).',
                },
              },
              {
                '@type': 'Question',
                name: 'Who has won the most Mestis championships?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Jukurit (Mikkeli) hold the record with 7 Mestis championships (2001, 2002, 2003, 2006, 2013, 2015, 2016), most before being promoted to the Liiga. Ketterä (Imatra) has 3 titles (2019, 2021, 2022). Jokerit Helsinki won back-to-back titles in 2024-25 and 2025-26 and was promoted to the Liiga. Other notable champions include Sport, KooKoo, and Kiekko-Espoo.',
                },
              },
              {
                '@type': 'Question',
                name: 'What is the format of Mestis?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Mestis operates as an open league with promotion and relegation. The Mestis champion faces a qualification series against the bottom Liiga team for the right to be promoted. The Liiga qualifiers were brought back for the 2024-25 season after being absent since 2013-14. The Mestis season runs from September to March, with the playoff structure varying by season.',
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
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>Mestis</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1, fontFamily: '"Bebas Neue", sans-serif' }}>
          Mestis (Finnish Second Tier)
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.95rem', marginTop: '0.5rem', maxWidth: '780px' }}>
          {teamLabel} across Finland. Founded 2000. The second-highest men&apos;s ice hockey league in Finland. Jokerit recently promoted to Liiga. Jukurit 7 Mestis titles, the most in league history. Open league with promotion/relegation to Liiga and Suomi-sarja.
        </p>
      </div>

      <section style={{ marginBottom: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
          {teamLabel} • MESTIS 2026-27
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1rem' }}>
          The 9 Mestis clubs for 2026-27 represent smaller Finnish cities and suburbs. Notable clubs include <strong>Jukurit</strong> (Mikkeli, originally a Mestis dynasty club, now in the Liiga), <strong>Ketterä</strong> (Imatra, 3-time Mestis champion), <strong>TUTO Hockey</strong> (Turku, 1-time Mestis champion and historic SM-liiga club), <strong>RoKi</strong> (Rovaniemi, the northernmost hockey team in Finland), <strong>IPK</strong> (Iisalmi, 1-time champion), and <strong>Hermes</strong> (Kokkola, the league&apos;s longest-running franchise). Jokerit Helsinki won back-to-back Mestis titles in 2024-25 and 2025-26 and was promoted to the Liiga for 2026-27, bringing the league back to 9 teams.
        </p>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.6 }}>
          Mestis arenas are typically small (1,000-4,500 capacity), with the largest being Kokkola Ice Hall (4,200) and the smallest being Keuruu Ice Hall (1,100). The league plays a 50-60 game regular season followed by best-of-7 playoffs. Mestis operates as an open league with promotion and relegation to and from the Liiga (top tier) and Suomi-sarja (third tier), and has historically been a development pipeline for NHL talent — the 2024-25 Jokerit roster alone featured 7 players who went on to sign NHL contracts.
        </p>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>MESTIS HISTORY</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            Mestis was established by the Finnish Ice Hockey Association in 2000 to replace the I-Divisioona (First Division), which had served as Finland&apos;s second-tier hockey league since 1975. The league was launched with 12 teams in the inaugural 2000-01 season and has been a key part of the Finnish hockey development system. From 2000 to 2008, the Liiga (then SM-liiga) was a closed league, making promotion to the top tier impractical for Mestis teams — except for KalPa, which was promoted in 2005 when the SM-liiga expanded from 13 to 14 teams. The SM-liiga qualifiers were reintroduced for 2008-09 to 2012-13, then removed again, before being brought back for the 2024-25 season.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            Jukurit dominated the league&apos;s first decade, winning the inaugural 2000-01 season and going on to claim 7 championships (2001, 2002, 2003, 2006, 2013, 2015, 2016) — the most in league history. The club was promoted to the SM-liiga (now Liiga) in 2016 after winning their 7th title. Other successful modern-era Mestis clubs include Ketterä (3 titles, dominant in 2019-22), Sport (3 titles, promoted 2014), and KooKoo (promoted 2015).
          </p>
          <p style={{ marginBottom: '1rem' }}>
            Jokerit Helsinki&apos;s story is particularly notable. The Helsinki-based club had been a Liiga fixture from 1975 to 2014, when financial difficulties forced them out. They spent 6 years in the second tier (KHL 2014-2020, then Mestis 2020-21 onward) and won back-to-back Mestis titles in 2024-25 and 2025-26, securing promotion back to the Liiga for 2026-27. Jokerit&apos;s return to the top flight brings the league back to 17 teams for the 2026-27 season, including the 12-time Liiga champion&apos;s presence.
          </p>
          <p>
            Mestis has been a stepping stone for several NHL players. Recent Liiga promotion alumni include Patrik Laine (Tappara, originally TPS, drafted 2016 #2 overall), Jesse Puljujarvi (Karpat, drafted 2016 #4 overall), and several others. The league&apos;s open promotion structure — combined with its geographic spread across smaller Finnish cities — makes it a unique testbed for Finnish hockey development. The Finnish Ice Hockey Association uses Mestis as a way to develop coaches, officials, and front-office staff, with many current Liiga personnel having first worked in Mestis.
          </p>
        </div>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>HOW MESTIS WORKS</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            Mestis operates as an open league with promotion and relegation to and from the Liiga (top tier) and Suomi-sarja (third tier). The Mestis champion faces a qualification series against the bottom Liiga team for the right to be promoted. The 2024-25 season marked the return of the Liiga-Mestis qualification series for the first time since 2013-14, with Jokerit Helsinki winning the 2024-25 Mestis championship and securing promotion to the Liiga.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The Mestis regular season runs from September to March, with each of the 9-10 teams playing 50-60 games depending on the season format. The schedule is structured to balance travel — the league&apos;s geographic spread from Rovaniemi in the Arctic to Helsinki&apos;s K-Vantaa suburb requires significant road trips. The playoff structure varies by season, typically featuring best-of-7 series in the quarterfinals, semifinals, and finals.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            Mestis rosters are typically 22-25 players per team. The league&apos;s import rules allow 3-5 import players, with most imports coming from North America, the Czech Republic, Slovakia, and other European countries. Mestis salary levels are modest by North American standards but reasonable by Finnish standards — top Mestis players earn €3,000-€5,000 per month during the season. The league&apos;s modest budget and smaller arenas (typically 1,000-4,500 capacity) mean that Mestis operates with significantly less revenue than the Liiga, but the open promotion structure provides a powerful motivation for both players and clubs.
          </p>
          <p>
            Mestis games are broadcast on C More (the league&apos;s primary broadcast partner) and on select Finnish regional sports networks. The 2025-26 Mestis championship between Jokerit Helsinki and Ketterä was a major Finnish hockey story — Jokerit&apos;s return to the Liiga after a 12-year absence was a watershed moment for Helsinki hockey, and the Jokerit-Liiga promotion helped drive increased media coverage of the Mestis throughout the 2025-26 season. The league&apos;s role as a development path for Finnish hockey — producing players like Patrik Laine, Jesse Puljujarvi, and Kaapo Kakko (who spent part of his development in the Liiga) — has positioned Mestis as one of the most effective second-tier leagues in the world.
          </p>
        </div>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Editorial standards.</strong> By Arnel Larracas, Founder &amp; Editor-in-Chief, RinkStop. Last reviewed 2026-10-09.<br />
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Data sources.</strong> Team count from RinkStop team_workspaces table. Founded 2000, Jukurit 7 titles, Jokerit promoted 2026, 9 teams 2026-27: Wikipedia (Mestis), hockeydb.com (Finland - Mestis League).<br />
          <span style={{ color: 'rgba(255,255,255,0.45)' }}><Link href="/editorial-policy" style={{ color: '#FFB81C' }}>Editorial policy</Link> · <Link href="/data-methodology" style={{ color: '#FFB81C' }}>Data methodology</Link> · <Link href="/corrections" style={{ color: '#FFB81C' }}>Report a correction</Link></span>
        </p>
      </section>
    </main>
  );
}
