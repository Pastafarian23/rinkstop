import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import Breadcrumb from '@/components/Breadcrumb';
import { Metadata } from 'next';
import styles from './league.module.css';

interface Props {
  params: Promise<{ country: string; league: string }>;
}

function formatName(slug: string): string {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function slugify(str: string): string {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { country, league } = await params;
  const leagueName = formatName(league);
  const countryName = formatName(country);
  return {
    title: `${leagueName} Hockey League (${countryName}) | RinkStop`,
    description: `Browse all ${leagueName} teams in ${countryName}. Full league roster, team listings, schedules, and standings.`,
    openGraph: {
      title: `${leagueName} (${countryName}) | RinkStop`,
      description: `${leagueName} hockey league — teams, schedules, and more in ${countryName}.`,
      type: 'website',
    },
  };
}

export default async function LeaguePage({ params }: Props) {
  const { country, league } = await params;
  const leagueName = formatName(league);
  const countryName = formatName(country);

  // Get league info
  const { data: leagueData } = await supabaseAdmin
    .from('leagues')
    .select('name, slug, level, country, description')
    .eq('slug', league)
    .single();

  // Get all teams in this league
  const { data: teams } = await supabaseAdmin
    .from('teams')
    .select('name, slug, league, city, home_rink_id')
    .eq('league', leagueName)
    .not('slug', 'is', null)
    .order('name');

  const { count: teamCount } = await supabaseAdmin
    .from('teams')
    .select('*', { count: 'exact', head: true })
    .eq('league', leagueName)
    .not('slug', 'is', null);

  // Get other leagues in same country
  const { data: otherLeagues } = await supabaseAdmin
    .from('leagues')
    .select('name, slug')
    .eq('country', countryName)
    .not('slug', 'is', null)
    .neq('slug', league)
    .order('name');

  const breadcrumbItems = [
    { label: 'Hockey', href: '/search' },
    { label: countryName, href: `/hockey/${country}` },
    { label: leagueName },
  ];

  const intro = `${leagueName} is one of ${otherLeagues?.length || 0} hockey leagues active in ${countryName}. The league features ${teamCount || teams?.length || 0} registered teams competing across multiple divisions. From youth and amateur levels to professional competition, ${leagueName} represents the heart of hockey in ${countryName}.`;

  return (
    <div className={styles.pageContainer}>
      <Breadcrumb items={breadcrumbItems} />

      <div className={styles.hero}>
        <div className={styles.heroBadge}>Hockey League</div>
        <h1 className={styles.heroTitle}>{leagueName}</h1>
        <p className={styles.heroLocation}>{countryName} · {teamCount || teams?.length || 0} Teams</p>
      </div>

      {leagueData?.description && (
        <section className={styles.introBlock}>
          <p>{leagueData.description}</p>
        </section>
      )}

      {!leagueData?.description && (
        <section className={styles.introBlock}>
          <p>{intro}</p>
        </section>
      )}

      {teams && teams.length > 0 && (
        <section className={styles.section}>
          <h2>Teams in {leagueName}</h2>
          <p className={styles.sectionDesc}>Browse all teams competing in {leagueName}.</p>
          <div className={styles.linkGrid}>
            {teams.map((team) => (
              <Link key={team.slug || team.name} href={`/teams/${country}/${league}/${team.slug}`} className={styles.entityLink}>
                <span className={styles.entityName}>{team.name}</span>
                {team.city && <span className={styles.entityMeta}>{team.city}</span>}
              </Link>
            ))}
          </div>
        </section>
      )}

      {otherLeagues && otherLeagues.length > 0 && (
        <section className={styles.section}>
          <h2>More Leagues in {countryName}</h2>
          <p className={styles.sectionDesc}>Other hockey leagues and competitions.</p>
          <div className={styles.linkGrid}>
            {otherLeagues.map((l) => (
              <Link key={l.slug || l.name} href={`/leagues/${country}/${l.slug}`} className={styles.entityLink}>
                <span className={styles.entityName}>{l.name}</span>
                <span className={styles.entityMeta}>Browse League →</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className={styles.linkFooter}>
        <Link href={`/hockey/${country}`} className={styles.footerLink}>← All {countryName} Hockey</Link>
        <Link href="/directory/leagues" className={styles.footerLink}>All Leagues</Link>
        <Link href="/directory/teams" className={styles.footerLink}>All Teams</Link>
      </section>
    </div>
  );
}
