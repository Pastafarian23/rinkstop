import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import Breadcrumb from '@/components/Breadcrumb';
import { Metadata } from 'next';
import { teamPageDecision, robotsMeta } from '@/lib/seo';
import styles from './team.module.css';

interface Props {
  params: Promise<{ country: string; league: string; team: string }>;
}

function formatName(slug: string): string {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function slugify(str: string): string {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { country, league, team } = await params;
  const teamName = formatName(team);
  const leagueName = formatName(league);
  const countryName = formatName(country);

  // Phase 1b SEO: evaluate noindex for thin team pages
  const { data: teamRow } = await supabaseAdmin
    .from('teams')
    .select('id, city, country, league_id, home_rink_id, logo_url, website_url, division')
    .eq('slug', team)
    .single();

  let robots: string | undefined;
  if (teamRow) {
    const fields = ['city', 'country', 'league_id', 'home_rink_id', 'logo_url', 'website_url', 'division'];
    const fieldCount = fields.filter(f => teamRow[f] != null && teamRow[f] !== '').length;
    // Count games as content (each game ~10 unique words: date, teams, score)
    const { count: gamesCount } = await supabaseAdmin
      .from('games')
      .select('id', { count: 'exact', head: true })
      .or(`home_team_id.eq.${teamRow.id},away_team_id.eq.${teamRow.id}`)
      .gte('date', new Date().toISOString().split('T')[0]);
    const uniqueWordCount = (gamesCount || 0) * 10;
    const decision = teamPageDecision(fieldCount, uniqueWordCount);
    robots = robotsMeta(decision);
  }

  return {
    title: `${teamName} Hockey Team | ${leagueName} | RinkStop`,
    description: `${teamName} roster, schedule, home arena, and stats. Part of the ${leagueName} in ${countryName}. Follow the team on RinkStop.`,
    robots,
    openGraph: {
      title: `${teamName} | ${leagueName}`,
      description: `${teamName} hockey team — roster, schedule, and more.`,
      type: 'website',
    },
  };
}

export default async function TeamPage({ params }: Props) {
  const { country, league, team } = await params;
  const teamName = formatName(team);
  const leagueName = formatName(league);
  const countryName = formatName(country);

  // Find team by slug
  const { data: teamData } = await supabaseAdmin
    .from('teams')
    .select('*')
    .eq('slug', team)
    .single();

  if (!teamData) notFound();

  // Get league info
  const { data: leagueData } = await supabaseAdmin
    .from('leagues')
    .select('name, slug, level')
    .eq('slug', league)
    .single();

  // Get home rink
  const { data: homeRink } = teamData.home_rink_id
    ? await supabaseAdmin.from('rinks').select('name, slug, city').eq('id', teamData.home_rink_id).single()
    : { data: null };

  // Get upcoming games
  const { data: games } = await supabaseAdmin
    .from('games')
    .select('id, date, time, home_team_name, away_team_name, venue_name, status, home_score, away_score')
    .or(`home_team_id.eq.${teamData.id},away_team_id.eq.${teamData.id}`)
    .gte('date', new Date().toISOString().split('T')[0])
    .order('date', { ascending: true })
    .limit(10);

  // Get other teams in same league
  const { data: sameLeagueTeams } = await supabaseAdmin
    .from('teams')
    .select('name, slug, league')
    .eq('league', leagueName)
    .not('slug', 'is', null)
    .neq('slug', team)
    .limit(10)
    .order('name');

  const breadcrumbItems = [
    { label: 'Hockey', href: '/search' },
    { label: countryName, href: `/hockey/${country}` },
    { label: leagueName, href: `/leagues/${country}/${league}` },
    { label: teamName },
  ];

  const rinkCitySlug = homeRink?.city ? slugify(homeRink.city) : null;

  return (
    <div className={styles.pageContainer}>
      <Breadcrumb items={breadcrumbItems} />

      <div className={styles.hero}>
        <div className={styles.heroBadge}>Hockey Team</div>
        <h1 className={styles.heroTitle}>{teamData.name}</h1>
        <p className={styles.heroLocation}>{leagueName} · {countryName}</p>
      </div>

      <div className={styles.infoGrid}>
        {homeRink && (
          <div className={styles.infoCard}>
            <span className={styles.infoIcon}>🏒</span>
            <div>
              <div className={styles.infoLabel}>Home Arena</div>
              <Link href={`/rinks/${country}/${rinkCitySlug}/${homeRink.slug}`} className={styles.infoLink}>{homeRink.name}</Link>
            </div>
          </div>
        )}
        {leagueData && (
          <div className={styles.infoCard}>
            <span className={styles.infoIcon}>🏆</span>
            <div>
              <div className={styles.infoLabel}>League</div>
              <Link href={`/leagues/${country}/${league}`} className={styles.infoLink}>{leagueData.name}</Link>
            </div>
          </div>
        )}
        {teamData.website && (
          <div className={styles.infoCard}>
            <span className={styles.infoIcon}>🌐</span>
            <div>
              <div className={styles.infoLabel}>Website</div>
              <a href={teamData.website} target="_blank" rel="noopener noreferrer" className={styles.infoLink}>{teamData.website}</a>
            </div>
          </div>
        )}
      </div>

      {games && games.length > 0 && (
        <section className={styles.section}>
          <h2>Upcoming Games — {teamData.name}</h2>
          <div className={styles.gamesList}>
            {games.map((game) => (
              <div key={game.id} className={styles.gameCard}>
                <div className={styles.gameDate}>
                  <span className={styles.gameMonth}>
                    {new Date(game.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })}
                  </span>
                  <span className={styles.gameDay}>
                    {new Date(game.date + 'T00:00:00').getDate()}
                  </span>
                </div>
                <div className={styles.gameInfo}>
                  <div className={styles.gameTeams}>
                    <span className={styles.teamName}>{game.away_team_name}</span>
                    <span className={styles.score}>{game.home_score ?? '-'} – {game.away_score ?? '-'}</span>
                    <span className={styles.teamName}>{game.home_team_name}</span>
                  </div>
                  <div className={styles.gameStatus}>{game.venue_name || (game.status === 'completed' ? 'Final' : game.time || 'TBA')}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {sameLeagueTeams && sameLeagueTeams.length > 0 && (
        <section className={styles.section}>
          <h2>More {leagueName} Teams</h2>
          <p className={styles.sectionDesc}>Other teams in the same league.</p>
          <div className={styles.linkGrid}>
            {sameLeagueTeams.map((t) => (
              <Link key={t.slug || t.name} href={`/teams/${country}/${league}/${t.slug}`} className={styles.entityLink}>
                <span className={styles.entityName}>{t.name}</span>
                <span className={styles.entityMeta}>{leagueName} →</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className={styles.linkFooter}>
        {leagueData && <Link href={`/leagues/${country}/${league}`} className={styles.footerLink}>← {leagueName} League</Link>}
        <Link href={`/hockey/${country}`} className={styles.footerLink}>All {countryName} Hockey</Link>
        <Link href="/directory/teams" className={styles.footerLink}>All Teams</Link>
      </section>
    </div>
  );
}
