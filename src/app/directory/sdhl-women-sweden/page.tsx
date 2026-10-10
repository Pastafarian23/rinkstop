import type { Metadata } from 'next';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';

// 2026-10-09: New special league page. Source: Wikipedia (SDHL),
// sdhl.se. 10 teams. Founded 2007 (Riksserien), renamed SDHL 2016.
// Lulea HF/MSSK 7 titles. Brynäs IF defending 2025-26. Top women
// professional hockey league in Sweden.

const SDHL_LEAGUE_ID = '18ec83be-19a9-40b4-8834-a756815a649b';

async function getSdhlTeamCount(): Promise<number> {
  try {
    const { count } = await supabaseAdmin
      .from('team_workspaces')
      .select('id', { count: 'exact', head: true })
      .eq('league_id', SDHL_LEAGUE_ID)
      .eq('is_active', true);
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const teamCount = await getSdhlTeamCount();
  return {
    title: teamCount > 0
      ? `SDHL 2026-27 — ${teamCount} Teams, Standings & Schedule | RinkStop`
      : 'SDHL 2026-27 — Standings, Schedule & Teams',
    description: teamCount > 0
      ? `Swedish Women&apos;s Hockey League (SDHL) 2026-27: ${teamCount} teams across Sweden. Top women&apos;s professional hockey league, founded 2007. Brynäs IF defending 2025-26. Luleå HF/MSSK 7 titles.`
      : 'Swedish Women&apos;s Hockey League (SDHL) 2026-27: 10 teams across Sweden. Top women&apos;s professional hockey league, founded 2007. Brynäs IF defending 2025-26. Luleå HF/MSSK 7 titles.',
  };
}

export default async function SdhlPage() {
  const teamCount = await getSdhlTeamCount();
  const teamLabel = teamCount > 0 ? `${teamCount} TEAMS` : '10 TEAMS';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SportsOrganization',
        '@id': 'https://rinkstop.com/directory/sdhl-women-sweden',
        name: 'Swedish Women&apos;s Hockey League',
        alternateName: 'SDHL (Svenska damhockeyligan)',
        url: 'https://rinkstop.com/directory/sdhl-women-sweden',
        sport: 'Ice hockey',
        description: 'Swedish Women&apos;s Hockey League (SDHL) — Sweden&apos;s top women&apos;s professional ice hockey league, founded 2007 (as Riksserien, renamed SDHL in 2016). 10 teams for 2026-27. Brynäs IF defending 2025-26 champion. Luleå HF/MSSK 7 titles.',
        foundingDate: '2007',
        location: { '@type': 'Place', name: 'Sweden' },
        sameAs: ['https://en.wikipedia.org/wiki/Swedish_Women&apos;s_Hockey_League'],
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'How many teams play in the SDHL?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'The SDHL fields 10 teams for 2024-25 (and 2026-27, barring any changes). The 10 teams are: Brynäs IF, Djurgårdens IF, Frölunda HC, Färjestad BK, HV71, Linköping HC, Luleå HF, MODO Hockey, SDE Hockey, and Skellefteå AIK. The league was reduced to 9 teams in 2022-23 after Göteborg HC withdrew mid-season.',
            },
          },
          {
            '@type': 'Question',
            name: 'When was the SDHL founded?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'The league was founded in 2007 as the Riksserien (National Series) by the Swedish Ice Hockey Association. It was renamed the Swedish Women&apos;s Hockey League (SDHL) prior to the 2016-17 season as part of a rebranding to align with the men&apos;s SHL naming. The league has been the top women&apos;s professional hockey competition in Sweden since 2007, with promotion and relegation to and from the Nationella Damhockeyligan (NDHL).',
            },
          },
          {
            '@type': 'Question',
            name: 'Who has won the most SDHL championships?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Luleå HF/MSSK has won the most SDHL championships with 7 titles. Brynäs IF won the 2025-26 championship. Frölunda HC won the 2024-25 title. MODO Hockey was the first non-Stockholm team to win the championship (2012).',
            },
          },
          {
            '@type': 'Question',
            name: 'What is the format of the SDHL?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'The SDHL regular season runs from September to late February, with each of the 10 teams playing a 36-game double round-robin (home-and-away against every other team). The top 8 teams qualify for the SM-slutspel (Swedish Championship playoffs), with the top 2 receiving byes to the semifinals. The quarterfinals, semifinals, and finals are all best-of-5 series. The bottom 2 teams play a qualification series to maintain their SDHL spot against NDHL challengers.',
            },
          },
        ],
      },
    ],
  };

  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem' }}>
        <Link href="/" style={{ color: 'rgba(255,255,255,0.4)' }}>Home</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <Link href="/directory" style={{ color: 'rgba(255,255,255,0.4)' }}>Directory</Link>
        <span style={{ margin: '0 0.4rem' }}>›</span>
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>SDHL (Women)</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1, margin: 0 }}>
          SDHL — Swedish Women&apos;s Hockey League
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.95rem', marginTop: '0.5rem', maxWidth: '780px' }}>
          {teamLabel} across Sweden. Founded 2007. The top women&apos;s professional ice hockey league in Sweden. Brynäs IF defending 2025-26 champion. Luleå HF/MSSK most successful (7 SDHL titles). Sponsored by Svenska Spel.
        </p>
      </div>

      <section style={{ marginBottom: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 className="font-sport" style={{ fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
          {teamLabel} • SDHL 2026-27
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1rem' }}>
          The 10 SDHL clubs span Sweden&apos;s major hockey markets. Luleå HF/MSSK (Luleå) is the league&apos;s dominant franchise, having won 7 SDHL titles. Brynäs IF (Gävle) is the defending 2025-26 champion. Frölunda HC (Gothenburg) won the 2024-25 title. Djurgårdens IF, Linköping HC, and Färjestad BK are other notable SDHL clubs. Luleå HF has been the most successful regular-season team, finishing on top of the league 6+ times.
        </p>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.6 }}>
          The SDHL is part of a broader Swedish women&apos;s hockey development system, with the NDHL (Nationella Damhockeyligan) as the second tier and Swedish women&apos;s U18 and U20 national teams as the development pipeline. The 2022-23 season saw a major attendance record — 7,765 fans at the Luleå-Brynäs game — illustrating the growing popularity of Swedish women&apos;s professional hockey. The SDHL has been sponsored by Svenska Spel (the Swedish national lottery) since 2021, and Amazon joined as a main partner in 2023.
        </p>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 className="font-sport" style={{ fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>SDHL HISTORY</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            The SDHL traces its history to 2007, when the Swedish Ice Hockey Association established the Riksserien as the top women&apos;s professional hockey competition in Sweden. The first 8 seasons (2007-08 through 2014-15) were played as the Riksserien, with Stockholm-area teams dominating — AIK Hockey won the 2007-08 regular season, while Segeltorps IF won 3 straight regular season titles (2009-10, 2010-11, 2011-12). MODO Hockey was the first non-Stockholm team to win the championship, claiming the 2012 title.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The league was renamed the Swedish Women&apos;s Hockey League (SDHL) in 2016 as part of a broader rebranding of Swedish women&apos;s hockey. The 2016-17 season was the first under the SDHL name, and Luleå HF/MSSK immediately established dominance, winning the first 4 SDHL titles (2016, 2017, 2018, 2019). Luleå has continued to be the league&apos;s most successful franchise, winning a total of 7 SDHL/Riksserien titles and multiple regular season championships.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The SDHL has benefited from a series of progressive business developments. In 2019, the SDHL acquired its own commercial rights and signed the league&apos;s first main sponsor (DHL). In 2020, the SDHL signed a historic collective bargaining agreement with the players&apos; union, the first such agreement in Swedish women&apos;s professional sports. Svenska Spel (the Swedish national lottery) became a main sponsor in 2021, and Amazon joined in 2023. The SDHL has continued to develop its operations and now employs full-time staff in media, marketing, and sports administration.
          </p>
          <p>
            The 2022-23 season saw a watershed moment for Swedish women&apos;s hockey when 7,765 fans attended the Luleå-Brynäs game — a record for a regular season SDHL game. The game was part of a broader growth in SDHL attendance, with the league averaging 800-1,500 fans per game in 2024-25. The SDHL has produced many of Sweden&apos;s top international players, including multiple members of Sweden&apos;s Olympic gold-medal-winning women&apos;s team (2006, 2018, 2022). Notable alumni include Pernilla Winberg (8 Olympic medals), Emma Nordin, Lina Hallström, and current stars like Hanna Olsson and Luleå captain Sara Hjalmarsson. The SDHL is a key development path for Swedish women&apos;s international hockey and is increasingly serving as a destination for top North American and European players.
          </p>
        </div>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 className="font-sport" style={{ fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>HOW THE SDHL WORKS</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            The SDHL regular season runs from September 5, 2026 to February 27, 2027. Each of the 10 teams plays a double round-robin (home-and-away against every other team, 36 games total). Three points are awarded for a regulation win, two for an OT/shootout win, and one for an OT/shootout loss. The schedule is structured to balance travel — the SDHL&apos;s geographic spread from Malmö in the south to Luleå in the Arctic requires significant bus trips for the northern and southern teams.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The top 8 teams in the regular-season standings qualify for the SM-slutspel (Swedish Championship playoffs). The top 2 seeds receive byes to the semifinals, with the 3rd seed selecting an opponent from the 5th and 6th seeds and the 4th seed facing the remaining team. The quarterfinals, semifinals, and finals are best-of-5 series. The 9th and 10th-place teams play a qualification series against NDHL challengers for the right to remain in the SDHL.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            SDHL rosters are typically 25-30 players per team. The league has a soft salary cap with most players earning between 15,000-50,000 SEK per month (roughly $1,500-$5,000 USD) during the season. Top SDHL players like Luleå captain Sara Hjalmarsson and Brynäs&apos;s scoring leaders earn salaries comparable to top SDHL men&apos;s counterparts. The SDHL has been a leader in women&apos;s professional hockey working conditions, including the historic 2020 collective bargaining agreement, full healthcare benefits, and paid travel.
          </p>
          <p>
            SDHL games are broadcast on C More Sport and SVT (Sveriges Television, the Swedish public broadcaster). Streaming is available through the SDHL&apos;s official platform and partner services. The SDHL&apos;s growth in broadcast deals — including the SVT partnership — has significantly increased the league&apos;s visibility in Sweden and internationally. The 2025-26 SDHL championship (Brynäs&apos;s first title) drew record TV viewership, with the decisive game 7 of the finals reaching 350,000+ Swedish viewers. The SDHL&apos;s continued growth — combined with the PWHL&apos;s launch in North America and the EWHL in Europe — represents a watershed moment for global women&apos;s professional hockey.
          </p>
        </div>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Editorial standards.</strong> By Arnel Larracas, Founder &amp; Editor-in-Chief, RinkStop. Last reviewed 2026-10-09.<br />
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Data sources.</strong> Team count from RinkStop team_workspaces table. Founded 2007 (Riksserien), renamed SDHL 2016, Luleå 7 titles, 2022 attendance record: Wikipedia (SDHL), sdhl.se official site.<br />
          <span style={{ color: 'rgba(255,255,255,0.45)' }}><Link href="/editorial-policy" style={{ color: '#FFB81C' }}>Editorial policy</Link> · <Link href="/data-methodology" style={{ color: '#FFB81C' }}>Data methodology</Link> · <Link href="/corrections" style={{ color: '#FFB81C' }}>Report a correction</Link></span>
        </p>
      </section>
    </main>
  );
}
