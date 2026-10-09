import type { Metadata } from 'next';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';

// 2026-10-09: New special league page. Source: SHL.se, Wikipedia (SHL),
// Swedish Ice Hockey Association 2026-27 regulations. Founded 1975 as
// Elitserien, renamed SHL in 2013. 14 teams, 52-game regular season.
// Skellefteå AIK defending champion (5th title). Färjestad BK most
// titles (10). Season runs Sept 19, 2026 - March 16, 2027.

const SHL_LEAGUE_ID = '69d4de0c-b072-4f52-8950-eb728acdc7f9';

async function getShlTeamCount(): Promise<number> {
  try {
    const { count } = await supabaseAdmin
      .from('team_workspaces')
      .select('id', { count: 'exact', head: true })
      .eq('league_id', SHL_LEAGUE_ID)
      .eq('is_active', true);
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const teamCount = await getShlTeamCount();
  return {
    title: teamCount > 0
      ? `SHL 2026-27 — ${teamCount} Teams, Standings & Schedule`
      : 'SHL 2026-27 — Standings, Schedule & Teams',
    description: teamCount > 0
      ? `Svenska Hockeyligan (SHL) 2026-27: ${teamCount} teams across Sweden. 52-game regular season. Defending champion Skellefteå AIK (5 titles). Le Mat Trophy playoff format.`
      : 'Svenska Hockeyligan (SHL) 2026-27: 14 teams across Sweden. 52-game regular season. Defending champion Skellefteå AIK (5 titles). Le Mat Trophy playoff format.',
  };
}

export default async function ShlPage() {
  const teamCount = await getShlTeamCount();
  const teamLabel = teamCount > 0 ? `${teamCount} TEAMS` : '14 TEAMS';

  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [{
            '@type': 'SportsOrganization',
            '@id': 'https://rinkstop.com/directory/shl',
            name: 'Svenska Hockeyligan',
            alternateName: 'SHL (formerly Elitserien, 1975-2013)',
            url: 'https://rinkstop.com/directory/shl',
            sport: 'Ice hockey',
            description: 'Svenska Hockeyligan (SHL) — Sweden\'s top professional ice hockey league, founded 1975 as Elitserien. Defending champion Skellefteå AIK; most successful club Färjestad BK (10 titles).',
            foundingDate: '1975',
            location: { '@type': 'Place', name: 'Sweden' },
            sameAs: ['https://en.wikipedia.org/wiki/Swedish_Hockey_League'],
          }, {
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'How many teams play in SHL?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'SHL fields 14 teams across Sweden for the 2026-27 season. The league was expanded from 12 to 14 teams for the 2015-16 season. IF Björklöven returns to SHL for 2026-27 after a multi-year absence in HockeyAllsvenskan.',
                },
              },
              {
                '@type': 'Question',
                name: 'Who has won the most SHL championships?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Färjestad BK holds the record with 10 SHL/Elitserien titles, the most of any Swedish club. Djurgårdens IF has 8, Brynäs IF 4, MoDo Hockey 4, Skellefteå AIK 5, and HV71 1. Skellefteå is the defending champion after winning the 2025-26 Le Mat Trophy.',
                },
              },
              {
                '@type': 'Question',
                name: 'When was the SHL founded?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'SHL was founded in 1975 as the Elitserien (the Swedish Elite League). The first season began October 5, 1975, with 10 teams. The league was renamed Svenska Hockeyligan in 2013 as part of a broader rebranding. Swedish ice hockey champions have been crowned since 1922, but the Le Mat Trophy has been awarded to the SHL playoff champion since the league\'s inaugural 1975-76 season.',
                },
              },
              {
                '@type': 'Question',
                name: 'What is the format of the SHL season?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The SHL regular season runs from late September to mid-March, with each of the 14 teams playing 52 games. Three points are awarded for a regulation or overtime win, two for a shootout win, one for an overtime loss, zero for a regulation loss. The top 6 teams qualify directly for the SM-slutspel quarterfinals; teams 7-10 play a best-of-three play-in; teams 11-12 are eliminated; teams 13-14 play a best-of-seven relegation series (Kvalserien) against the top HockeyAllsvenskan finisher.',
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
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>SHL</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1, fontFamily: '"Bebas Neue", sans-serif' }}>
          SHL — Svenska Hockeyligan
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.95rem', marginTop: '0.5rem', maxWidth: '780px' }}>
          {teamLabel} across Sweden. Founded 1975 as Elitserien, renamed SHL in 2013. 52-game regular season. Le Mat Trophy playoff championship. Defending champion: Skellefteå AIK (5th title, 2025-26).
        </p>
      </div>

      <section style={{ marginBottom: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
          {teamLabel} • SHL 2026-27
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1rem' }}>
          The 14 SHL clubs in 2026-27 are concentrated in Sweden&apos;s four hockey regions — Stockholm (Djurgården, AIK historic), Mälardalen (Brynäs, HV71, Linköping), Västsverige (Frölunda, Färjestad), Norrland (Skellefteå, Luleå, MoDo), and Skåne (Malmö, Rögle, Växjö, Örebro). IF Björklöven returns to SHL for 2026-27 after a 4-year absence, bringing the league back to 14 teams.
        </p>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.6 }}>
          Marquee arenas: Scandinavium (Göteborg, 12,000 — Frölunda home), Läkerol Arena (Linköping, 8,500), Coop Norrbotten Arena (Luleå, 6,000), Skellefteå Kraft Arena (Skellefteå, 6,001), and Löfbergs Arena (Karlstad, 8,500 — Färjestad home). SHL attendance averages 6,000-8,000 per game, the highest sustained average in European hockey.
        </p>
      </section>

      {/* SHL HISTORY */}
      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>SHL HISTORY</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            Swedish ice hockey championship competition dates to 1922, but the modern top-flight league — the Elitserien — began on October 5, 1975 with 10 teams. The Swedish Ice Hockey Association (Svenska Ishockeyförbundet) administered the league through 1975-76. The Elitserien was renamed the SHL in June 2013 as part of a broader corporate rebrand. The 14-club format was adopted for the 2015-16 season after years of discussion that the 12-team configuration was too small to sustain competitive balance and development depth.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The Elitserien was dominated through the 1980s and 1990s by Djurgårdens IF (8 titles, mostly in the 1980s and early 1990s) and Brynäs IF (4 titles). Färjestad BK took over as the league&apos;s most successful modern club with 10 titles (1970s through 2000s), particularly dominant in the late 1990s and 2000s. MoDo Hockey and Luleå HF emerged as northern-Sweden powers in the 2000s. HV71 Jönköping won their only title in 2008.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            Skellefteå AIK has been the league&apos;s most successful modern club. Founded in 1921 and based in the small northern city of Skellefteå (population ~35,000), Skellefteå has won 5 SHL titles, the most recent in 2025-26. Their success with a small-market budget and emphasis on player development has made them a model for sustainable European hockey operations. The Skellefteå Kraft Arena regularly sells out at 6,000+ for playoff games.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The 2019-20 SHL season was suspended on March 11, 2020 due to the COVID-19 pandemic, with no Swedish champion awarded. The 2020-21 season was played in a condensed format, with the league playing a shortened schedule behind closed doors for much of the year. The 2021-22 season returned to a normal schedule, with Frölunda HC claiming the title.
          </p>
          <p>
            The 2024-25 season saw Djurgården IF return to the SHL after a 3-year absence in HockeyAllsvenskan, having won the 2024-25 second-tier title. The 2026-27 season adds IF Björklöven (Umeå) — a former Elitserien and SHL member that returns for the first time since 2021-22, giving the SHL 14 teams for the seventh consecutive season. Skellefteå AIK enters the 2026-27 season as the defending champion and the most successful modern-era club.
          </p>
        </div>
      </section>

      {/* HOW THE SHL WORKS */}
      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>HOW THE SHL WORKS</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            The SHL regular season runs from late September to mid-March, with each of the 14 teams playing 52 games. The schedule is balanced — each team plays every other team four times (twice home, twice away) over the course of the regular season. Three points are awarded for a regulation or overtime win, two for a shootout win, one for an overtime loss, and zero for a regulation loss. The 2026-27 season opens September 19, 2026 and concludes with the regular season final round on March 16, 2027; 364 total games will be played.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The SM-slutspel (Swedish Championship playoffs) is the postseason structure. The top 6 teams in the regular-season standings advance directly to the best-of-seven quarterfinals. Teams finishing 7th through 10th play a best-of-three play-in round, with the four winners advancing to the quarterfinals. Teams finishing 11th and 12th are eliminated; teams 13th and 14th play a best-of-seven relegation series (Kvalserien) against the top HockeyAllsvenskan finisher for the right to play in next year&apos;s SHL.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The SM-slutspel quarterfinals, semifinals, and finals are all best-of-seven. The team with the higher regular-season finish has home-ice advantage. The Swedish champion receives the Le Mat Trophy, named after hockey pioneer Sigge "Le Mat" Ohlsson and awarded since 1922. Skellefteå AIK won the Le Mat Trophy for the 5th time in 2025-26, joining Färjestad BK (10), Djurgården (8), Brynäs (4), MoDo (4), and HV71 (1) as the most successful clubs in Swedish history.
          </p>
          <p>
            SHL rosters are capped at 25 players for the standard playing roster, with a maximum of 4 import (non-Swedish) players per team. The Swedish league has long been a development pipeline for the NHL — Swedish-born players have won multiple Hart Trophies, Norris Trophies, and Conn Smythe Trophies — and SHL clubs regularly host NHL scouts. The Champions Hockey League (CHL), reformed for the 2014-15 season, includes top SHL clubs in a pan-European competition against Liiga, DEL, and Czech Extraliga teams. SHL games are broadcast in Sweden by TV4 Group and the C More Entertainment platforms.
          </p>
        </div>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Editorial standards.</strong> By Arnel Larracas, Founder &amp; Editor-in-Chief, RinkStop. Last reviewed 2026-10-09.<br />
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Data sources.</strong> Team count from RinkStop team_workspaces table (live query). Founded 1975, 10-team to 14-team expansion, Le Mat Trophy history, Skellefteå 5 titles, COVID-19 2019-20 cancellation: shl.se (SHL in English), swehockey.se 2026-27 regulations, Wikipedia (Swedish Hockey League).<br />
          <span style={{ color: 'rgba(255,255,255,0.45)' }}><Link href="/editorial-policy" style={{ color: '#FFB81C' }}>Editorial policy</Link> · <Link href="/data-methodology" style={{ color: '#FFB81C' }}>Data methodology</Link> · <Link href="/corrections" style={{ color: '#FFB81C' }}>Report a correction</Link></span>
        </p>
      </section>
    </main>
  );
}
