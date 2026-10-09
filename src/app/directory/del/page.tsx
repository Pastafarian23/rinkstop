import type { Metadata } from 'next';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';

// 2026-10-09: New special league page. Source: penny-del.org, Wikipedia
// (DEL). Founded 1994 (replaced Eishockey-Bundesliga). 14 teams. Defending
// champion Eisbären Berlin (12th title, 2025-26). Most successful club.
// Season: Sept 17, 2026 to April 30, 2027.

const DEL_LEAGUE_ID = '03e919d1-2180-443b-aba4-6719d25d2eff';

async function getDelTeamCount(): Promise<number> {
  try {
    const { count } = await supabaseAdmin
      .from('team_workspaces')
      .select('id', { count: 'exact', head: true })
      .eq('league_id', DEL_LEAGUE_ID)
      .eq('is_active', true);
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const teamCount = await getDelTeamCount();
  return {
    title: teamCount > 0
      ? `DEL 2026-27 — ${teamCount} Teams, Standings & Schedule`
      : 'DEL 2026-27 — Standings, Schedule & Teams',
    description: teamCount > 0
      ? `Deutsche Eishockey Liga (DEL / PENNY DEL) 2026-27: ${teamCount} teams across Germany. Defending champion Eisbären Berlin (12 titles). Founded 1994.`
      : 'Deutsche Eishockey Liga (DEL / PENNY DEL) 2026-27: 14 teams across Germany. Defending champion Eisbären Berlin (12 titles). Founded 1994.',
  };
}

export default async function DelPage() {
  const teamCount = await getDelTeamCount();
  const teamLabel = teamCount > 0 ? `${teamCount} TEAMS` : '14 TEAMS';

  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem 3rem' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [{
            '@type': 'SportsOrganization',
            '@id': 'https://rinkstop.com/directory/del',
            name: 'Deutsche Eishockey Liga',
            alternateName: 'DEL (sponsored: PENNY DEL)',
            url: 'https://rinkstop.com/directory/del',
            sport: 'Ice hockey',
            description: 'Deutsche Eishockey Liga (DEL) — Germany\'s top professional ice hockey league, founded 1994 to replace the bankrupt Eishockey-Bundesliga. Defending champion: Eisbären Berlin (12 titles, the most in league history).',
            foundingDate: '1994',
            location: { '@type': 'Place', name: 'Germany' },
            sameAs: ['https://en.wikipedia.org/wiki/Deutsche_Eishockey_Liga'],
          }, {
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'How many teams play in the DEL?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The DEL fields 14 teams across Germany for the 2026-27 season, with Krefeld Pinguine promoted from DEL2 for the 2026-27 campaign after winning the 2025-26 DEL2 title. The DEL was expanded from 12 founding members (1994-95) to 14 by 2002-03 and has remained at 14 since. The league plans further expansion to 16 teams in coming years.',
                },
              },
              {
                '@type': 'Question',
                name: 'Who has won the most DEL championships?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Eisbären Berlin holds the record with 12 DEL championships (most recent: 2025-26, their 12th title). Adler Mannheim is second with 7 titles. Other successful clubs: EHC Red Bull München (6), Kölner Haie (2), ERC Ingolstadt (1), Krefeld Pinguine (1), and Frankfurt Lions (1). Eisbären\'s 12 titles in 32 seasons (2004-05 through 2025-26) makes them the most successful franchise in modern German professional hockey.',
                },
              },
              {
                '@type': 'Question',
                name: 'When was the DEL founded?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The DEL was founded in 1994 to replace the Eishockey-Bundesliga, which had become financially unsustainable by 1993-94. Twenty of the 21 remaining 1st and 2nd Bundesliga clubs voted in January 1994 to create the new entity as a private company (DEL Betriebsgesellschaft mbH), the first professional sports league in Germany operated outside the national federation. Founding members included Augsburger EV, EHC Dynamo Berlin, Düsseldorfer EG, Kölner EC, Mannheimer ERC, and EC Hedos München (defending Bundesliga champion at the time).',
                },
              },
              {
                '@type': 'Question',
                name: 'What is the format of the DEL season?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'The DEL regular season runs from September to April, with each of the 14 teams playing 52 games. The top 6 teams qualify for the DEL playoffs directly, teams 7-10 play a pre-playoff round, teams 11-13 are eliminated, and 14th place plays a best-of-seven relegation series against the DEL2 champion. Playoffs are best-of-seven through all rounds. The DEL champion is decided in April or May.',
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
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>DEL</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1, fontFamily: '"Bebas Neue", sans-serif' }}>
          DEL — Deutsche Eishockey Liga
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.95rem', marginTop: '0.5rem', maxWidth: '780px' }}>
          {teamLabel} across Germany. Founded 1994 to replace the Eishockey-Bundesliga. Sponsorship name: PENNY DEL. Defending champion: Eisbären Berlin (12th title, 2025-26).
        </p>
      </div>

      <section style={{ marginBottom: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
          {teamLabel} • DEL 2026-27
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1rem' }}>
          The 14 DEL clubs in 2026-27 span all major German metropolitan areas: Berlin (Uber Arena, 14,200 — Eisbären), Munich (SAP Garden, 11,000 — EHC Red Bull München), Cologne (Lanxess Arena, 18,500 — Kölner Haie), Mannheim (SAP Arena, 13,600 — Adler Mannheim), Nuremberg, Frankfurt, Hamburg via Bremerhaven, and the Ruhr region (Iserlohn). The 2026-27 season marks the return of Krefeld Pinguine after a 4-year DEL2 absence, and the first season for the league&apos;s expanded playoff format.
        </p>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.6 }}>
          Marquee matchups include the Berlin-Munich rivalry (Eisbären vs. EHC Red Bull München, the two most successful modern DEL clubs), the northern derby (Hamburg-area clubs), and the Ruhr Valley derby. Average DEL attendance is 6,000-8,000 per game, with playoff games regularly selling out the larger arenas in Berlin, Munich, and Cologne.
        </p>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>DEL HISTORY</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            The DEL was founded in January 1994 in response to the Eishockey-Bundesliga&apos;s financial collapse. By the 1993-94 season, only 11 of the Bundesliga&apos;s 18 first-division clubs wanted to continue, two clubs had folded during the season, and ice hockey&apos;s reputation in Germany was severely damaged. Twenty of the 21 remaining 1st and 2nd Bundesliga clubs voted in January 1994 to create the DEL as a privately operated company — a novel structure for German professional sports at the time, and the first professional league in Germany managed by a company whose members were themselves incorporated.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The DEL&apos;s first season, 1994-95, began with 18 teams split into three regional groups (North/West, Central, South). The league contracted to 16 teams for 1995-96 and to 14 teams by 2002-03, where it has remained. The original Eishockey-Bundesliga structure (with relegation) was replaced by a closed league with a license-application process, modeled on the North American NHL.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The early DEL was dominated by Adler Mannheim (3 titles in the league&apos;s first 4 seasons, 1996-99) and Kölner Haie (2 titles in 2001-02 and 2002-03). Frankfurt Lions won the 2003-04 title, the only DEL championship in their short history. The Munich Barons, an expansion franchise backed by the SAP co-founder Dietmar Hopp, won the 1999-2000 title before relocating to the NHL&apos;s expansion San Jose Sharks program and folding the DEL franchise.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            Eisbären Berlin emerged as the league&apos;s dominant club from 2004-05 onward, winning 12 of the 21 championships between 2004-05 and 2025-26. The Berlin club, based in the 14,200-seat Uber Arena, has been the standard-bearer for DEL hockey in the modern era. Other successful modern clubs include EHC Red Bull München (6 titles, with the club backed by Red Bull ownership since 2012), Adler Mannheim (3 modern titles), and ERC Ingolstadt (1 title in 2013-14).
          </p>
          <p>
            The DEL joined the Champions Hockey League (CHL) in the 2014-15 season, giving German clubs regular matches against SHL, Liiga, and Czech Extraliga opposition. The 2019-20 DEL season was suspended on March 10, 2020 due to the COVID-19 pandemic, with no German champion awarded for the first time in DEL history. Eisbären Berlin enters the 2026-27 season as the defending champion and the most successful modern DEL club. The DEL was renamed the PENNY DEL under a sponsorship deal in 2022.
          </p>
        </div>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>HOW THE DEL WORKS</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            The DEL regular season runs from September to April, with each of the 14 teams playing 52 games in 2026-27 (home-and-home series against every other team, weighted by travel geography). The 2026-27 season opened September 17, 2026 and will conclude with the regular season final round on or around April 11, 2027. Three points are awarded for a regulation or overtime win, two for a shootout win, one for an overtime loss, and zero for a regulation loss.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The DEL playoff structure was expanded for 2025-26. The top 6 teams in the regular-season standings advance directly to the playoff quarterfinals. Teams 7th through 10th play a pre-playoff round (best-of-three) for the right to advance to the quarterfinals. Teams 11th through 13th are eliminated. 14th place plays a best-of-seven relegation series (the "Play-out" round) against the DEL2 champion, with the winner earning the right to play in next year&apos;s DEL.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The DEL playoffs are best-of-seven through every round, from the quarterfinals through the semifinals and the DEL finals. The team with the higher regular-season finish has home-ice advantage throughout. The DEL champion is determined in April or May each year. Eisbären Berlin is the most successful club in DEL history with 12 titles, most recently in 2025-26.
          </p>
          <p>
            DEL rosters are capped at 23 players for the standard playing roster, with a maximum of 14 import (non-German, non-EU) players per team. The DEL is widely considered the third-strongest professional league in Europe after the KHL and SHL, and the fourth-strongest in the world. DEL games are broadcast in Germany by Magenta Sport and ServusTV/DF1, with selected games on free-to-air channels. The DEL&apos;s official media partner and digital platforms are managed by the league office in Munich.
          </p>
        </div>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Editorial standards.</strong> By Arnel Larracas, Founder &amp; Editor-in-Chief, RinkStop. Last reviewed 2026-10-09.<br />
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Data sources.</strong> Team count from RinkStop team_workspaces table (live query). Founded 1994, Eisbären Berlin 12 titles, Munich Barons 2000, COVID-19 2019-20 cancellation, Krefeld Pinguine 2026-27 return: penny-del.org, Wikipedia (Deutsche Eishockey Liga).<br />
          <span style={{ color: 'rgba(255,255,255,0.45)' }}><Link href="/editorial-policy" style={{ color: '#FFB81C' }}>Editorial policy</Link> · <Link href="/data-methodology" style={{ color: '#FFB81C' }}>Data methodology</Link> · <Link href="/corrections" style={{ color: '#FFB81C' }}>Report a correction</Link></span>
        </p>
      </section>
    </main>
  );
}
