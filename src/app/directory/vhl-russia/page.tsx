import type { Metadata } from 'next';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';

// 2026-10-09: New special league page. Source: Wikipedia (Supreme Hockey
// League), vhlru.ru. Founded 2010 as Russia's second tier. Renamed to
// "All-Russian Hockey League" in 2022-23. 32 teams in 2025-26. Most
// teams are KHL farm clubs. Torpedo-Gorky is defending champion (1st
// title). Toros Neftekamsk has the most titles (3).

const VHL_LEAGUE_ID = '30fef7f6-0054-4605-83b7-ec619b72f328';

async function getVhlTeamCount(): Promise<number> {
  try {
    const { count } = await supabaseAdmin
      .from('team_workspaces')
      .select('id', { count: 'exact', head: true })
      .eq('league_id', VHL_LEAGUE_ID)
      .eq('is_active', true);
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const teamCount = await getVhlTeamCount();
  return {
    title: teamCount > 0
      ? `VHL Russia 2026-27 — ${teamCount} Teams, Standings & Petrov Cup | RinkStop`
      : 'VHL Russia 2026-27 — Petrov Cup, Standings & Teams',
    description: teamCount > 0
      ? `All-Russian Hockey League (VHL / OLIMPBET VHL) 2026-27: ${teamCount} teams across Russia. The second tier of Russian hockey. Most teams are KHL farm clubs. Petrov Cup championship. Toros Neftekamsk most successful (3 titles).`
      : 'All-Russian Hockey League (VHL) 2026-27: 32 teams across Russia. The second tier of Russian hockey. Petrov Cup championship.',
  };
}

export default async function VhlPage() {
  const teamCount = await getVhlTeamCount();
  const teamLabel = teamCount > 0 ? `${teamCount} TEAMS` : '32 TEAMS';

  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [{
            '@type': 'SportsOrganization',
            '@id': 'https://rinkstop.com/directory/vhl-russia',
            name: 'All-Russian Hockey League (VHL)',
            alternateName: 'Высшая хоккейная лига (VHL) / OLIMPBET VHL',
            url: 'https://rinkstop.com/directory/vhl-russia',
            sport: 'Ice hockey',
            description: 'All-Russian Hockey League (VHL) — Russia\'s second-tier professional ice hockey league, founded 2010. The feeder to the KHL. Most teams are KHL farm clubs. Petrov Cup championship.',
            foundingDate: '2010',
            location: { '@type': 'Place', name: 'Russia' },
            sameAs: ['https://en.wikipedia.org/wiki/Supreme_Hockey_League'],
          }, {
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'How many teams play in the VHL?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The VHL fields 32 Russian clubs for the 2025-26 season (the 2026-27 season is expected to be similar). The league has had 40+ teams in some seasons but contracted after 2022 due to international sanctions. The league is the second tier of Russian hockey, below the KHL and above the MHL.',
                },
              },
              {
                '@type': 'Question',
                name: 'When was the VHL founded?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The VHL was founded in 2010 to replace the Major League of the Russian Championship (Vysshaya Liga) as Russia&apos;s second-tier professional league. The league was originally called the Supreme Hockey League (Vysshaya Hokkeynaya Liga) and was renamed to "All-Russian Hockey League" (Vserossiyskaya Hokkeynaya Liga) in 2022-23.',
                },
              },
              {
                '@type': 'Question',
                name: 'Who has won the most VHL championships?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Toros Neftekamsk has won the most VHL titles with 3, and is the only club to qualify for the playoffs in all 9+ championship seasons. Torpedo-Gorky won the most recent (2024-25) championship. Other multiple-time VHL champions include HC Yugra, HC Saryarka, and Neftyanik Almetyevsk.',
                },
              },
              {
                '@type': 'Question',
                name: 'What is the VHL format?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The VHL regular season runs from September to March, with each of the 32 teams playing 60-65 games. The 2025-26 season had 992 regular-season games. The top teams in each conference qualify for the VHL playoffs, with the Petrov Cup (named after Russian hockey legend Anatoli Petrov) awarded to the playoff champion. The league is the primary feeder to the KHL, with most VHL teams serving as KHL farm clubs.',
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
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>VHL</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1, fontFamily: '"Bebas Neue", sans-serif' }}>
          VHL — All-Russian Hockey League
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.95rem', marginTop: '0.5rem', maxWidth: '780px' }}>
          {teamLabel} across Russia. Founded 2010. The second tier of Russian hockey, just below the KHL. Most teams are KHL farm clubs. Petrov Cup championship. Toros Neftekamsk 3-time champion; Torpedo-Gorky defending.
        </p>
      </div>

      <section style={{ marginBottom: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
          {teamLabel} • VHL 2026-27
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1rem' }}>
          The 32 VHL teams represent 60+ Russian cities and span the country from Kaliningrad (Baltica) to Khabarovsk (Amur). Major market teams include HC Yugra (Khanty-Mansiysk), Toros Neftekamsk (Bashkortostan), HC Saryarka (Karaganda until 2015, now defunct), and Neftyanik Almetyevsk (Tatarstan). The league is the primary feeder to the KHL — Khimik Voskresensk is the VHL affiliate of KHL&apos;s Spartak Moscow, Zvezda Moscow is CSKA Moscow&apos;s VHL team, and Loko Yaroslavl operates both a VHL and MHL team.
        </p>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.6 }}>
          The VHL has more than 90,000 combined stadium capacity across its 32 teams, with average attendance around 2,000 per game. Total league attendance exceeds 1.5 million per season. The 2025-26 VHL regular season featured 992 games. Notable VHL arenas include Kristall Arena (Moscow, Khimik Voskresensk home), Arena Ugra (Khanty-Mansiysk, 5,500 capacity), and the Neftekhimik Ice Palace (Nizhnekamsk).
        </p>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>VHL HISTORY</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            The VHL was founded in 2010 to replace the Major League of the Russian Championship (Vysshaya Liga), the previous second-tier Russian professional league that had served as a promotion/relegation bridge to the Russian Superleague (and later the KHL). The new VHL was created as a private company with the goal of stabilizing the second tier of Russian hockey and providing a clearer development path to the KHL.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The league was originally called the Supreme Hockey League (Vysshaya Hokkeynaya Liga) and was renamed to "All-Russian Hockey League" (Vserossiyskaya Hokkeynaya Liga) in 2022-23. The 2022-23 rebranding coincided with a major expansion and contraction cycle as the league adapted to Russia&apos;s international isolation following the 2022 invasion of Ukraine. Foreign teams (Kazakhstan&apos;s Saryarka, Belarus&apos;s Yunost Minsk) departed, and the league reorganized around Russian clubs only.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            Toros Neftekamsk has won the most VHL championships with 3 titles and is the only club to qualify for the playoffs in all 9+ championship seasons. The club has been a consistent force in the VHL, reaching the semifinal stage six times. The 2024-25 VHL championship was won by Torpedo-Gorky, their first VHL title, defeating the regular-season champion in the Petrov Cup Final.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The VHL was initially conceived as a league with promotion and relegation to the KHL, but those plans were abandoned in favor of a fixed-league model similar to the KHL&apos;s. VHL teams are required to meet financial standards and arena requirements, with a 5,000-seat minimum arena capacity for most teams. The league&apos;s structure makes it the second-strongest professional league in the KHL family of competitions (KHL, VHL, MHL, NMHL), with players moving between the leagues as needed.
          </p>
          <p>
            The VHL is the primary feeder to the KHL. Most VHL teams are owned by or affiliated with a KHL club — Khimik Voskresensk is the VHL affiliate of Spartak Moscow (KHL), Zvezda Moscow is CSKA Moscow&apos;s VHL team, Loko Yaroslavl operates both VHL and MHL teams, and many other VHL clubs serve as the second-tier development team for KHL parent clubs. The VHL&apos;s role in the Russian hockey development system — feeding players from the MHL through the VHL to the KHL — makes it the most important second-tier league in the world outside the AHL.
          </p>
        </div>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>HOW THE VHL WORKS</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            The VHL regular season runs from September to March, with each of the 32 teams playing 60-65 games depending on the season format. The 2025-26 season featured 992 regular-season games across the league&apos;s 32 teams. Games are typically played in a 3-game weekend series (Friday-Saturday-Sunday) with travel between cities that are often 1,000+ km apart.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The top teams in each conference qualify for the VHL playoffs, with the Petrov Cup (named after Russian hockey legend Anatoli Petrov) awarded to the playoff champion. The Petrov Cup has been the VHL&apos;s playoff championship trophy since the league&apos;s founding in 2010. Anatoli Petrov was a legendary Soviet and Russian hockey player who played for Spartak Moscow.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            VHL rosters are typically 25-30 players per team. Players move freely between VHL and KHL teams in the same ownership group (e.g., a player can be promoted from Khimik Voskresensk to Spartak Moscow during the season). VHL teams also draw from the MHL (Junior Hockey League), the second tier of Russian junior hockey. The league&apos;s import rules are more permissive than the MHL — most VHL teams carry 5-10 import players, primarily from Belarus, Kazakhstan, and other countries with Russian-friendly hockey programs.
          </p>
          <p>
            VHL games are broadcast on the league&apos;s official website (vhlru.ru) and on Russian regional sports networks. The league is sponsored by OLIMPBET (a Russian betting company) under the name OLIMPBET VHL. International broadcasting is limited. The VHL&apos;s role as Russia&apos;s second-tier professional league — the KHL is the top tier, the MHL is the major-junior development league, and the NMHL is the under-17 development league — makes it a critical part of the Russian hockey system, with the league serving as the primary path for KHL prospects who are not yet ready for the top level of professional hockey.
          </p>
        </div>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Editorial standards.</strong> By Arnel Larracas, Founder &amp; Editor-in-Chief, RinkStop. Last reviewed 2026-10-09.<br />
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Data sources.</strong> Team count from RinkStop team_workspaces table. Founded 2010, 2022-23 rename, Toros 3 titles, Torpedo-Gorky defending, 992 games 2025-26: Wikipedia (Supreme Hockey League / All-Russian Hockey League), vhlru.ru/en/about.<br />
          <span style={{ color: 'rgba(255,255,255,0.45)' }}><Link href="/editorial-policy" style={{ color: '#FFB81C' }}>Editorial policy</Link> · <Link href="/data-methodology" style={{ color: '#FFB81C' }}>Data methodology</Link> · <Link href="/corrections" style={{ color: '#FFB81C' }}>Report a correction</Link></span>
        </p>
      </section>
    </main>
  );
}
