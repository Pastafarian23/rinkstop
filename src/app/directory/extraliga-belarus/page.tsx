import type { Metadata } from 'next';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';

// 2026-10-09: New special league page. Source: Wikipedia (Belarusian
// Extraleague), hockey.by. Founded 1992. 14 teams in 2024-25. Metallurg
// Zhlobin 5 titles (defending 2025-26). Yunost Minsk 11 titles (most
// overall). Betera-Экстралига sponsored.

const BELARUS_LEAGUE_ID = '5b317488-d92a-416b-967e-b0b7b572edbc';

async function getBelarusTeamCount(): Promise<number> {
  try {
    const { count } = await supabaseAdmin
      .from('team_workspaces')
      .select('id', { count: 'exact', head: true })
      .eq('league_id', BELARUS_LEAGUE_ID)
      .eq('is_active', true);
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const teamCount = await getBelarusTeamCount();
  return {
    title: teamCount > 0
      ? `Belarus Extraliga 2026-27 — ${teamCount} Teams, Standings | RinkStop`
      : 'Belarus Extraliga 2026-27 — Standings, Schedule & Teams',
    description: teamCount > 0
      ? `Belarusian Extraleague (Betera-Экстралига) 2026-27: ${teamCount} teams across Belarus. Top professional hockey league, founded 1992. Metallurg Zhlobin defending 2025-26. Yunost Minsk 11 titles.`
      : 'Belarusian Extraleague (Betera-Экстралига) 2026-27: 14 teams across Belarus. Top professional hockey league, founded 1992. Metallurg Zhlobin defending 2025-26.',
  };
}

export default async function BelarusPage() {
  const teamCount = await getBelarusTeamCount();
  const teamLabel = teamCount > 0 ? `${teamCount} TEAMS` : '14 TEAMS';

  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [{
            '@type': 'SportsOrganization',
            '@id': 'https://rinkstop.com/directory/extraliga-belarus',
            name: 'Belarusian Extraleague',
            alternateName: 'Betera-Экстралига (sponsored)',
            url: 'https://rinkstop.com/directory/extraliga-belarus',
            sport: 'Ice hockey',
            description: 'Belarusian Extraleague (BHL) — the top professional ice hockey league in Belarus, founded 1992. 14 teams for 2024-25. Metallurg Zhlobin defending 2025-26 champion (5th title). Yunost Minsk most successful with 11 titles.',
            foundingDate: '1992',
            location: { '@type': 'Place', name: 'Belarus' },
            sameAs: ['https://en.wikipedia.org/wiki/Belarusian_Extraleague'],
          }, {
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'How many teams play in the Belarusian Extraleague?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The Belarusian Extraleague fields 14 teams for 2024-25 (expanding for 2026-27 with Slavutich Smolensk and Aviator added). The 14 teams are concentrated in Belarus with 1 Russian participant. Notable clubs include Yunost Minsk, Metallurg Zhlobin, HK Gomel, Neman Grodno, HC Shakhtyor Soligorsk, and HC Brest.',
                },
              },
              {
                '@type': 'Question',
                name: 'When was the Belarusian Extraleague founded?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The Belarusian Extraleague was founded in 1992 as the top ice hockey league in Belarus, following the country&apos;s independence from the Soviet Union. The inaugural 1992-93 season was won by Tivali Minsk (now Yunost Minsk lineage). The league was officially reorganized in 2006 as the Belarusian Extraleague, with the current structure featuring a single championship division (Extraleague/Extraleague A) and the second tier (Vysshaya Liga).',
                },
              },
              {
                '@type': 'Question',
                name: 'Who has won the most Belarusian Extraleague championships?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Yunost Minsk has won the most Belarusian championships with 11 titles (2004, 2005, 2006, 2009, 2010, 2011, 2016, 2019, 2020, 2021, 2025). HC Neman Grodno has 7 titles, Tivali Minsk/Dinamo-Minsk 5, and Metallurg Zhlobin 5 (2012, 2022, 2023, 2024, 2026). Metallurg Zhlobin is the defending 2025-26 champion.',
                },
              },
              {
                '@type': 'Question',
                name: 'What is the format of the Belarusian Extraleague?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The Belarusian Extraleague regular season runs from September to March, with each of the 14 teams playing 52 games (4 rounds of home-and-away). The top 6 teams advance directly to the playoff quarterfinals, with teams 7-10 playing a best-of-3 play-in series. The playoffs are best-of-7. The league has a 2-point system (win in regulation/OT/shootout = 2 points, OT/shootout loss = 1 point), following the model used by the NHL and KHL.',
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
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>Belarus Extraliga</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1, fontFamily: '"Bebas Neue", sans-serif' }}>
          Belarusian Extraleague (Betera-Экстралига)
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.95rem', marginTop: '0.5rem', maxWidth: '780px' }}>
          {teamLabel} across Belarus. Founded 1992. The top professional ice hockey league in Belarus. Betera-Экстралига is the sponsored name. Metallurg Zhlobin defending 2025-26 champion (5th title). Yunost Minsk 11 overall titles, the most in league history.
        </p>
      </div>

      <section style={{ marginBottom: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
          {teamLabel} • BELARUSIAN EXTRALEAGUE 2026-27
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1rem' }}>
          The 14+ Extraleague clubs represent the principal hockey markets in Belarus. <strong>Yunost Minsk</strong> (Minsk) is the most decorated club with 11 titles, dominant in the 2004-06 and 2019-21 eras. <strong>Metallurg Zhlobin</strong> (Zhlobin, Gomel Oblast) is the defending 2025-26 champion with 5 titles. <strong>HC Neman Grodno</strong> (Grodno) has 7 titles. <strong>HK Gomel</strong> (Gomel) has 1 title (2003). Other notable clubs include HC Shakhtyor Soligorsk, HC Brest, HC Vitebsk, and HC Dinamo-Molodechno.
        </p>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.6 }}>
          The 2024-25 season added two new teams: Slavutich Smolensk (a Russian team) and Aviator (promoted from the Belarusian Vysshaya Liga). Both will play in the 2024-25 season. The Extraleague uses the 2-point system (win in regulation/OT/shootout = 2 points, OT/shootout loss = 1 point), following the model used by the NHL and KHL. The 2026-27 season will be the 35th in league history, making it one of the longest-running professional leagues in Eastern Europe.
        </p>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>BELARUSIAN EXTRALEAGUE HISTORY</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            The Belarusian Extraleague was founded in 1992 as the top ice hockey league in newly-independent Belarus, following the dissolution of the Soviet Union in December 1991. The inaugural 1992-93 season was won by Tivali Minsk (now Yunost Minsk lineage). The league was initially contested among a small number of teams that had previously competed in Soviet hockey leagues, including Tivali Minsk, Neman Grodno, Khimik Novopolotsk (Polimir), and others. The league&apos;s early years saw Tivali Minsk, Polimir, and Neman Grodno as the dominant forces.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The league was officially reorganized in 2006 as the Belarusian Extraleague, with the Belarusian Ice Hockey Association establishing a formal championship structure. From 2008-09 to 2017-18, the league was divided into two divisions — Extraleague A (top 8 teams) and Extraleague B (next 9 teams) — with promotion and relegation between the two. The 2018-19 season saw a restructuring back to a single-division format (with the top 8 teams in the standings qualifying for the playoffs), which has continued since. The 2021-22 season saw the format simplified to 12 teams in a single championship, with the Vysshaya Liga serving as the second tier.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            Yunost Minsk&apos;s dominance from 2004-2011 (winning 6 of 8 championships) established the club as the league&apos;s preeminent force. Metallurg Zhlobin&apos;s emergence from 2022 onward (4 titles in 5 seasons, plus 2025-26) marked a shift in the league&apos;s competitive balance. The 2024-25 season was won by Yunost Minsk (their 11th title), returning the league to its traditional power structure after Metallurg&apos;s recent run.
          </p>
          <p>
            The Belarusian Extraleague has been affected by the 2022 Russia-Ukraine war in indirect ways. The league has continued to operate despite the broader international sanctions environment, with the Belarusian Ice Hockey Association maintaining its position in the IIHF. The league&apos;s title sponsor since 2022 has been Betera, a Belarusian betting company. The Extraleague&apos;s most successful alumni include several players who went on to KHL careers, including Dynamo Minsk and Yunost Minsk products who have contributed to Belarus&apos;s international teams at the IIHF World Championship Division I level.
          </p>
        </div>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>HOW THE BELARUSIAN EXTRALEAGUE WORKS</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            The Belarusian Extraleague regular season runs from September to March, with each of the 14 teams playing 52 games (4 rounds of home-and-away, totaling 91 games per team per season if including the postseason). The 2-point system is used: 2 points for a win in regulation/overtime/shootout, 1 point for an overtime/shootout loss, 0 points for a regulation loss. This is the same scoring system used by the NHL and KHL.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The top 6 teams in the regular-season standings advance directly to the playoff quarterfinals. Teams finishing 7th through 10th play a best-of-3 play-in series for the remaining 2 spots in the quarterfinals. The playoffs are best-of-7 series through the quarterfinals, semifinals, and finals. The 2024-25 season is the first under the league&apos;s new title sponsor Betera.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            Extraleague rosters are typically 22-25 players per team. The league&apos;s import rules are flexible — most teams carry 3-5 import players, primarily from Russia, Belarus, and other countries with Russian-friendly hockey programs. The league&apos;s salary levels are modest by European professional standards but sufficient to attract quality players from the broader region. The Extraleague&apos;s primary development pipeline is the Belarusian youth system and the KHL, which has historically signed the league&apos;s top players.
          </p>
          <p>
            Belarusian Extraleague games are broadcast on Belarus 5 (Belarusian public television) and on Fanseat (the international streaming platform). The league&apos;s modest budget and the broader international sanctions environment have limited the league&apos;s international visibility, but the Extraleague remains a popular domestic sport in Belarus, with regular-season games drawing 1,500-3,000 fans and playoff games selling out the Minsk Arena (capacity 15,000, the largest hockey venue in Belarus). The league&apos;s role as the country&apos;s top professional hockey competition has been a source of national pride, particularly in the years since the country&apos;s hosting of the 2014 IIHF World Championship.
          </p>
        </div>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Editorial standards.</strong> By Arnel Larracas, Founder &amp; Editor-in-Chief, RinkStop. Last reviewed 2026-10-09.<br />
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Data sources.</strong> Team count from RinkStop team_workspaces table. Founded 1992, Yunost Minsk 11 titles, Metallurg 5 titles (defending), 2024-25 expansion: Wikipedia (Belarusian Extraleague), hockey.by official site.<br />
          <span style={{ color: 'rgba(255,255,255,0.45)' }}><Link href="/editorial-policy" style={{ color: '#FFB81C' }}>Editorial policy</Link> · <Link href="/data-methodology" style={{ color: '#FFB81C' }}>Data methodology</Link> · <Link href="/corrections" style={{ color: '#FFB81C' }}>Report a correction</Link></span>
        </p>
      </section>
    </main>
  );
}
