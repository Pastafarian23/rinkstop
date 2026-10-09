import type { Metadata } from 'next';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';

// 2026-10-09: New special league page. Source: Wikipedia (Junior Hockey
// League (Russia)), engmhl.khl.ru. Founded 2009. 33 teams across 3
// countries (Russia, Belarus, Kazakhstan). Major-junior league with
// U20 age cap. Kharlamov Cup championship. All teams are KHL/VHL
// farm team subsidiaries. Loko Yaroslavl is most successful.

const MHL_LEAGUE_ID = 'e052d66a-6f63-42da-94fc-25a809203c2f';

async function getMhlTeamCount(): Promise<number> {
  try {
    const { count } = await supabaseAdmin
      .from('team_workspaces')
      .select('id', { count: 'exact', head: true })
      .eq('league_id', MHL_LEAGUE_ID)
      .eq('is_active', true);
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const teamCount = await getMhlTeamCount();
  return {
    title: teamCount > 0
      ? `MHL Russia 2026-27 — ${teamCount} Teams, Standings & Kharlamov Cup | RinkStop`
      : 'MHL Russia 2026-27 — Kharlamov Cup, Standings & Teams',
    description: teamCount > 0
      ? `Junior Hockey League (MHL) Russia 2026-27: ${teamCount} teams across Russia, Belarus, Kazakhstan. Major-junior league, U20 age cap. Kharlamov Cup championship. All teams are KHL/VHL farm club subsidiaries. Loko Yaroslavl most successful.`
      : 'Junior Hockey League (MHL) Russia 2026-27: 33 teams across 3 countries. Major-junior league, U20 age cap. Kharlamov Cup championship.',
  };
}

export default async function MhlPage() {
  const teamCount = await getMhlTeamCount();
  const teamLabel = teamCount > 0 ? `${teamCount} TEAMS` : '33 TEAMS';

  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [{
            '@type': 'SportsOrganization',
            '@id': 'https://rinkstop.com/directory/mhl-russia',
            name: 'Junior Hockey League (MHL)',
            url: 'https://rinkstop.com/directory/mhl-russia',
            sport: 'Ice hockey',
            description: 'Junior Hockey League (MHL, Молодёжная хоккейная лига) — Russia\'s major-junior ice hockey league for players U20. Founded 2009. 33 teams across Russia, Belarus, and Kazakhstan. Kharlamov Cup championship. All teams are KHL/VHL farm club subsidiaries.',
            foundingDate: '2009',
            location: { '@type': 'Place', name: 'Russia' },
            sameAs: ['https://en.wikipedia.org/wiki/Junior_Hockey_League_(Russia)'],
          }, {
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'How many teams play in the MHL?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The MHL fields 33 teams in 2026-27, representing 3 countries: 31 from Russia, 1 from Belarus (Minskie Zubry / Dinamo-Shinnik), and 1 from Kazakhstan (Snezhnye Barsy). The MHL-B (second division) fields an additional set of junior teams, with promotion/relegation between the two.',
                },
              },
              {
                '@type': 'Question',
                name: 'When was the MHL founded?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The MHL was founded in 2009 as a major-junior ice hockey league to develop players for the KHL. The inaugural 2009-10 season opened on September 4, 2009 in Moscow with MHC Dynamo defeating CSKA-Red Army 6-2 in the first game. The league expanded from 22 teams in the inaugural season to 33-40 teams in subsequent years and has become the primary development path for Russian hockey players.',
                },
              },
              {
                '@type': 'Question',
                name: 'What is the Kharlamov Cup?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The Kharlamov Cup is the MHL&apos;s playoff championship trophy, named after legendary Soviet ice hockey forward Valeri Kharlamov (1948-1981). The Kharlamov Cup is awarded annually as the Ice Hockey Federation of Russia&apos;s official junior championship, following a 16-team playoff at the end of the regular season. Loko Yaroslavl has won the most Kharlamov Cups with 3.',
                },
              },
              {
                '@type': 'Question',
                name: 'What is the MHL age limit?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'MHL players must be age 20 or younger. The league is the primary development path for the KHL — virtually all MHL teams are farm clubs of KHL or VHL professional teams, with player movement between the MHL and the parent club happening routinely. Top MHL players are drafted into the KHL, NHL, or other professional leagues.',
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
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>MHL</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1, fontFamily: '"Bebas Neue", sans-serif' }}>
          MHL — Junior Hockey League (Russia)
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.95rem', marginTop: '0.5rem', maxWidth: '780px' }}>
          {teamLabel} across Russia, Belarus, and Kazakhstan. Founded 2009. Major-junior league for players U20. Primary development path for the KHL. Kharlamov Cup championship. Loko Yaroslavl 3-time champion.
        </p>
      </div>

      <section style={{ marginBottom: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
          {teamLabel} • MHL 2026-27
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1rem' }}>
          The 33 MHL teams in 2026-27 are organized into two conferences (Gold and Silver), each with 2 divisions. The Gold Division includes the elite MHL teams: Loko Yaroslavl, JHC Dynamo Moscow, Krasnaya Armiya (CSKA Moscow&apos;s junior team), SKA-1946 (SKA St. Petersburg&apos;s junior team), JHC Spartak, Mikhailov Academy, Dinamo-Shinnik, JHC Dynamo SPb, and Almaz. The Silver Division includes the next tier of teams from Moscow, St. Petersburg, and other major Russian cities.
        </p>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.6 }}>
          Virtually every MHL team is the junior affiliate of a KHL or VHL professional team. Examples: Loko Yaroslavl is the farm team of Lokomotiv Yaroslavl (KHL); Krasnaya Armiya is CSKA Moscow&apos;s junior team; SKA-1946 is SKA St. Petersburg&apos;s junior team; Taifun is Admiral Vladivostok&apos;s junior team; Irbis is Ak Bars Kazan&apos;s junior team. The league is the direct pipeline for the KHL — most KHL players passed through the MHL on their way to professional hockey.
        </p>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>MHL HISTORY</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            The MHL was founded in 2009 as the major-junior ice hockey league in Russia, with the goal of creating a structured development path for young Russian players feeding into the KHL (which was itself founded in 2008). The inaugural 2009-10 season opened on September 4, 2009 in Moscow, with MHC Dynamo defeating CSKA-Red Army 6-2 in the first MHL game. The first season had 22 teams, all from Russia, divided into 4 divisions.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The league expanded rapidly. The 2010-11 season saw the addition of Minskie Zubry (Belarus) and MHC Yunost (also Belarus), as well as HC Riga (Latvia), making the MHL an international league for the first time. The 2011-12 season added a second division called MHL-B for the junior teams of VHL clubs, with promotion/relegation between MHL and MHL-B. The league also expanded to include teams from the Czech Republic (HC Energie Karlovy Vary, 2012-13) and Hungary (Patriot Budapest, 2012-13), though those teams later withdrew.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The MHL was affected by the War in Donbass (2014-2022) and Russia&apos;s broader international isolation following 2022. Several teams from Ukraine, Latvia, and other countries withdrew. The league contracted to its current 33-team format, with most teams now from Russia plus 1 from Belarus (Dinamo-Shinnik) and 1 from Kazakhstan (Snezhnye Barsy). HC Riga (Latvia) and Patriot Budapest (Hungary) departed; Energiya (Khmelnytskyi, Ukraine) and HC Donbass withdrew when the Donbas conflict began.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The Kharlamov Cup, named after legendary Soviet ice hockey forward Valeri Kharlamov (1948-1981), has been the MHL&apos;s playoff championship trophy since the league&apos;s founding. Kharlamov played his entire career for CSKA Moscow and was one of the greatest Soviet players of all time, winning 2 Olympic gold medals and 8 IIHF World Championship golds before his tragic death in a car accident in 1981 at age 33. The MHL is named with his motto in mind: &quot;Liga Silnykh&quot; (The League of the Strong).
          </p>
          <p>
            Loko Yaroslavl has won the most Kharlamov Cups with 3 titles, the most recent in 2024-25. Other successful MHL franchises include Krasnaya Armiya (CSKA Moscow&apos;s junior team), SKA-1946 (SKA St. Petersburg), and Mikhailov Academy. The MHL has produced numerous NHL draft picks, including top Russian prospects who have moved to North America as teenagers. The league&apos;s role in the broader Russian hockey development system — from youth hockey (NMHL) through the MHL, VHL, and KHL — is the most structured player development pipeline in the world outside North America.
          </p>
        </div>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>HOW THE MHL WORKS</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            The MHL regular season runs from September to March, with each team playing 55-65 games depending on the season format. The 2025-26 season had 33 teams in two conferences (Gold and Silver), with each conference having 2 divisions. The top teams in each division qualify for the Kharlamov Cup playoffs, a 16-team single-elimination bracket.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            MHL player age is capped at 20. Players are typically drafted into the MHL at 16-17, develop through the league for 2-3 seasons, and either sign with the parent KHL/VHL club or are drafted into the NHL. The MHL works closely with the NMHL (National Junior Hockey League, the under-17 development league) as part of the Russian hockey development pyramid.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            MHL rosters are typically 28-32 players per team. The league&apos;s import rules vary — most MHL teams are primarily Russian with limited import slots, but the KHL-farm structure means players can be promoted and demoted freely between the MHL, VHL, and KHL. The Kharlamov Cup playoff is held in March-April, with the champion representing the MHL at international junior tournaments.
          </p>
          <p>
            MHL games are broadcast on KHL-TV (Russia) and on the league&apos;s official YouTube channel. International broadcasting is limited due to Russia&apos;s 2022+ international isolation. The MHL is part of the broader KHL family of competitions (MHL, NMHL, VHL, KHL) which together form Russia&apos;s hierarchical professional hockey system. The MHL&apos;s role as the primary development path for the KHL makes it the most important junior league in the world outside North America&apos;s CHL and USHL.
          </p>
        </div>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Editorial standards.</strong> By Arnel Larracas, Founder &amp; Editor-in-Chief, RinkStop. Last reviewed 2026-10-09.<br />
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Data sources.</strong> Team count from RinkStop team_workspaces table. Founded 2009, Kharlamov Cup named after Valeri Kharlamov, 33 teams in 3 countries, MHL-B 2011 launch: Wikipedia (Junior Hockey League Russia), engmhl.khl.ru.<br />
          <span style={{ color: 'rgba(255,255,255,0.45)' }}><Link href="/editorial-policy" style={{ color: '#FFB81C' }}>Editorial policy</Link> · <Link href="/data-methodology" style={{ color: '#FFB81C' }}>Data methodology</Link> · <Link href="/corrections" style={{ color: '#FFB81C' }}>Report a correction</Link></span>
        </p>
      </section>
    </main>
  );
}
