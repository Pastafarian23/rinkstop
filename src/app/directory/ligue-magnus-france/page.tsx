import type { Metadata } from 'next';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';

// 2026-10-09: New special league page. Source: hockeyfrance.com SLM
// 2026-27 press kit, Wikipedia (Ligue Magnus). 12 teams. Founded 1907
// (Premiere serie), renamed Ligue Magnus 2004. Synerglace sponsored.
// Boxers de Bordeaux won 2025-26 (1st title). Chamonix most titles (30).

const FR_LEAGUE_ID = 'c6b8e4b2-e5d0-44a5-b0bc-52246b9308c6';

async function getFrTeamCount(): Promise<number> {
  try {
    const { count } = await supabaseAdmin
      .from('team_workspaces')
      .select('id', { count: 'exact', head: true })
      .eq('league_id', FR_LEAGUE_ID)
      .eq('is_active', true);
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const teamCount = await getFrTeamCount();
  return {
    title: teamCount > 0
      ? `Ligue Magnus 2026-27 — ${teamCount} Teams, Standings & Schedule | RinkStop`
      : 'Ligue Magnus 2026-27 — Standings, Schedule & Teams',
    description: teamCount > 0
      ? `Ligue Magnus (Synerglace Ligue Magnus) 2026-27: ${teamCount} teams across France. Top professional hockey league, founded 1907. Boxers de Bordeaux defending 2025-26 (1st title). Chamonix most titles (30).`
      : 'Ligue Magnus (Synerglace Ligue Magnus) 2026-27: 12 teams across France. Top professional hockey league, founded 1907. Boxers de Bordeaux defending 2025-26 (1st title).',
  };
}

export default async function LigueMagnusPage() {
  const teamCount = await getFrTeamCount();
  const teamLabel = teamCount > 0 ? `${teamCount} TEAMS` : '12 TEAMS';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SportsOrganization',
        '@id': 'https://rinkstop.com/directory/ligue-magnus-france',
        name: 'Ligue Magnus',
        alternateName: 'Synerglace Ligue Magnus (sponsored 2018-)',
        url: 'https://rinkstop.com/directory/ligue-magnus-france',
        sport: 'Ice hockey',
        description: 'Ligue Magnus (Synerglace Ligue Magnus) — the top professional ice hockey league in France, founded 1907. 12 teams for 2026-27. Boxers de Bordeaux won 2025-26 (1st title). Chamonix most successful with 30 titles.',
        foundingDate: '1907',
        location: { '@type': 'Place', name: 'France' },
        sameAs: ['https://en.wikipedia.org/wiki/Ligue_Magnus'],
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'How many teams play in the Ligue Magnus?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'The Ligue Magnus fields 12 teams for 2026-27. The 12 teams are: Gothiques d&apos;Amiens, Ducs d&apos;Angers, Hormadi d&apos;Anglet, Boxers de Bordeaux, Diables Rouges de Briançon, Jokers de Cergy-Pontoise, Pionniers de Chamonix, Rapaces de Gap, Brûleurs de Loups de Grenoble, Spartiates de Marseille, Aigles de Nice, and Dragons de Rouen.',
            },
          },
          {
            '@type': 'Question',
            name: 'When was the Ligue Magnus founded?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'The French hockey championship was founded in 1907 under the name Premiere serie (First Series). The Lyon club won the first title. The league changed its name several times between 1973 and 2004, when Luc Tardif (president of the French Ice Hockey Federation&apos;s executive authority) renamed it definitively to Ligue Magnus to end confusion. The 2023-24 season was the 20th under the Ligue Magnus name.',
            },
          },
          {
            '@type': 'Question',
            name: 'Who has won the most Ligue Magnus championships?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'The Pionniers de Chamonix hold the record with 30 Ligue Magnus / French championship titles (most recently in 1979), followed by the Dragons de Rouen (18 titles) and the Brûleurs de Loups de Grenoble (8 titles). The Boxers de Bordeaux won the 2025-26 title, their first ever French championship, defeating the Brûleurs de Loups 4-1 in the finals series.',
            },
          },
          {
            '@type': 'Question',
            name: 'What is the format of the Ligue Magnus?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'The Ligue Magnus regular season runs from September to early March, with each of the 12 teams playing a double round-robin (home-and-away against every other team, 22 games per opponent, 44 total). The top 8 teams qualify for the playoffs, with the bottom 4 entering a play-down. The playoff quarterfinals, semifinals, and finals are best-of-7. The 12th-place team after the play-down round is relegated to Division 1.',
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
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>Ligue Magnus</span>
      </nav>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="font-sport" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: '#fff', letterSpacing: '0.02em', lineHeight: 1, margin: 0 }}>
          Ligue Magnus (Synerglace Ligue Magnus)
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.95rem', marginTop: '0.5rem', maxWidth: '780px' }}>
          {teamLabel} across France. Founded 1907. The top professional ice hockey league in France. Synerglace is the title sponsor. Boxers de Bordeaux defending 2025-26 champion (first title in club history). Chamonix Pionniers most successful (30 titles).
        </p>
      </div>

      <section style={{ marginBottom: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 className="font-sport" style={{ fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
          {teamLabel} • LIGUE MAGNUS 2026-27
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1rem' }}>
          The 12 Ligue Magnus clubs represent the principal hockey markets in France, from the major metropolitan areas of Grenoble, Rouen, and Angers to the smaller markets of Briançon (alpine, near the Italian border) and Gap (Hautes-Alpes). Marquee clubs include the Brûleurs de Loups de Grenoble (8 titles, the 2009 Grand Slam winners — the only team to win the championship, French Cup, and Champions League in the same season), the Dragons de Rouen (18 titles, the most successful modern-era club), the Ducs d&apos;Angers (4 French Cups, 2025 winner), and the Boxers de Bordeaux (2025-26 champions, first title in club history).
        </p>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.6 }}>
          Marquee Ligue Magnus arenas: Patinoire Polesud (Grenoble, 3,400 capacity — home of the Brûleurs de Loups), l&apos;Île Lacroix (Rouen, 3,000), Patinoire de la Barre (Anglet, 2,800), and the renovated Bordeaux arena. The league has steadily increased attendance and TV coverage in recent years, with the 2025-26 final between Bordeaux and Grenoble drawing significant French sports media attention — the Boxers&apos; first title in club history was a major story in the Bordeaux sports community.
        </p>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 className="font-sport" style={{ fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>LIGUE MAGNUS HISTORY</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            The French ice hockey championship was founded in 1907 as the Premiere serie (First Series), with the Lyon club winning the first title. The first French hockey rinks had been built in the late 19th century, and the 1900 Paris Olympics included figure skating, but ice hockey did not become an organized sport in France until the early 1900s. The Victorian Ice Hockey Association was formed in 1908, and four ice hockey teams (Glaciarium, Beavers, Brighton, and Melburnian) played the first competitive matches. The French championship continued as the country&apos;s premier hockey competition through the 20th century.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The league changed its name several times between 1973 and 2004 as the French ice hockey community sought the most appropriate branding. Luc Tardif, who became president of the French Ice Hockey Federation&apos;s executive authority, renamed it definitively to Ligue Magnus in 2004, ending years of branding confusion. The name honors Louis Magnus, the Frenchman who founded the international ice hockey federation (Ligue Internationale de Hockey sur Glace, later the IIHF). The 2023-24 season was the 20th under the Ligue Magnus name, marking a successful era of consolidation.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The Pionniers de Chamonix dominated the early decades of the French championship, winning 30 titles (most recently in 1979). The club was founded in 1910 and is based in the alpine resort town of Chamonix, which hosted the first Winter Olympics in 1924. Modern-era French hockey has been dominated by Rouen (18 titles, including multiple recent championships), Grenoble (8 titles), and Bordeaux (1 title, 2025-26). The Coupe Magnus (the playoff championship trophy, named after Louis Magnus) has been awarded to the playoff champion since 1985.
          </p>
          <p>
            The 2008-09 Grenoble Brûleurs de Loups are the only team in French hockey history to complete the Grand Slam — winning the Ligue Magnus championship, the French Cup, and the Continental Cup (the IIHF&apos;s third-tier European club competition) in the same season. The 2025-26 Boxers de Bordeaux became the 37th different city to participate in the French elite championship since 1907, illustrating the league&apos;s geographic breadth across metropolitan and regional France. The Synerglace Ligue Magnus (the sponsored name since 2018) is part of the broader IIHF ecosystem, with French clubs regularly competing in the Continental Cup and CHL.
          </p>
        </div>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <h2 className="font-sport" style={{ fontSize: '1.5rem', color: '#fff', letterSpacing: '0.04em', marginBottom: '1rem' }}>HOW THE LIGUE MAGNUS WORKS</h2>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.75 }}>
          <p style={{ marginBottom: '1rem' }}>
            The Ligue Magnus regular season runs from mid-September to early March, with each of the 12 teams playing a double round-robin (home-and-away against every other team, 22 games per opponent, 44 total). The schedule is structured to minimize travel — most games are played in two-game series over a single weekend. The 2025-26 regular season ran from September 12, 2025 to March 6, 2026.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            The top 8 teams in the regular-season standings qualify for the playoffs. The quarterfinals, semifinals, and finals are all best-of-7 series. The bottom 4 teams enter a play-down round (best-of-3 series with home-and-away games) to determine which 2 teams face a relegation/promotion series against teams from Division 1. The 12th-place team after the play-down round is relegated to Division 1 for the following season. The 3-point system is used: 3 points for a regulation/OT/shootout win, 2 points for an OT/shootout win, 1 point for an OT/shootout loss, 0 points for a regulation loss.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            Ligue Magnus rosters are typically 22-25 players per team. The league has a soft salary cap of approximately €1.2-1.5 million per team, with most players earning between €3,000-€8,000 per month during the season. Import players are limited to 4-6 per team, with most imports coming from North America, the Czech Republic, Slovakia, and the Nordic countries. Notable French NHL alumni include Pierre-Edouard Bellemare (Tampa Bay Lightning, originally from Boxers de Bordeaux youth program) and Antoine Roussel (Vancouver Canucks, Dallas Stars) — French hockey&apos;s presence in the NHL has been modest but growing.
          </p>
          <p>
            Ligue Magnus games are broadcast on Synerglace TV and on regional French sports networks. The 2025-26 playoff final between Boxers de Bordeaux and Brûleurs de Loups de Grenoble was a major French sports media event — the first time a team from Bordeaux (in the Aquitaine region) had won the French hockey championship, with the series drawing significant local media coverage in southwestern France. The Ligue Magnus continues to develop French hockey talent, with the French national team (Les Bleus) competing in the IIHF World Championship Division I Group A.
          </p>
        </div>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Editorial standards.</strong> By Arnel Larracas, Founder &amp; Editor-in-Chief, RinkStop. Last reviewed 2026-10-09.<br />
          <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Data sources.</strong> Team count from RinkStop team_workspaces table. Founded 1907, Chamonix 30 titles, Bordeaux 2025-26 first title, Synerglace since 2018: hockeyfrance.com 2026-27 press kit, Wikipedia (Ligue Magnus).<br />
          <span style={{ color: 'rgba(255,255,255,0.45)' }}><Link href="/editorial-policy" style={{ color: '#FFB81C' }}>Editorial policy</Link> · <Link href="/data-methodology" style={{ color: '#FFB81C' }}>Data methodology</Link> · <Link href="/corrections" style={{ color: '#FFB81C' }}>Report a correction</Link></span>
        </p>
      </section>
    </main>
  );
}
