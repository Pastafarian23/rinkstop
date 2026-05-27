import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import Breadcrumb from '@/components/Breadcrumb';
import { Metadata } from 'next';
import styles from './country.module.css';

interface Props {
  params: Promise<{ country: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { country } = await params;
  const countryName = formatCountryName(country);
  return {
    title: `${countryName} Hockey — Ice Hockey Teams, Rinks & Leagues | RinkStop`,
    description: `Find hockey teams, ice rinks, and leagues in ${countryName}. The complete ${countryName} hockey directory with player stats, team schedules, and rink locations.`,
    openGraph: {
      title: `${countryName} Hockey | RinkStop`,
      description: `Hockey in ${countryName} — rinks, teams, leagues, and more.`,
      type: 'website',
    },
  };
}

function formatCountryName(slug: string): string {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function slugify(str: string): string {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export default async function CountryPage({ params }: Props) {
  const { country } = await params;
  const countryName = formatCountryName(country);

  // Get unique cities with rinks
  const { data: cityRows } = await supabaseAdmin
    .from('rinks')
    .select('city, province')
    .eq('country', countryName)
    .not('city', 'is', null)
    .not('slug', 'is', null);

  // Get leagues
  const { data: leagues } = await supabaseAdmin
    .from('leagues')
    .select('name, slug, level')
    .eq('country', countryName)
    .order('name');

  // Get teams
  const { data: teams } = await supabaseAdmin
    .from('teams')
    .select('name, slug, league, home_rink_id')
    .eq('country', countryName)
    .not('slug', 'is', null)
    .limit(30)
    .order('name');

  // Counts
  const { count: rinkCount } = await supabaseAdmin
    .from('rinks').select('*', { count: 'exact', head: true })
    .eq('country', countryName).not('slug', 'is', null);

  const { count: teamCount } = await supabaseAdmin
    .from('teams').select('*', { count: 'exact', head: true })
    .eq('country', countryName).not('slug', 'is', null);

  const uniqueCities = cityRows
    ? Array.from(new Map((cityRows as any[]).map((c: any) => [c.city, c])).values()) as { city: string; province: string | null }[]
    : [];

  const breadcrumbItems = [
    { label: 'Hockey', href: '/search' },
    { label: countryName },
  ];

  const intro = `${countryName} is home to a growing hockey community spanning ${uniqueCities.length} cit${uniqueCities.length === 1 ? 'y' : 'ies'}, ${leagues?.length || 0} leagues, and ${rinkCount || 0} registered rinks. From youth programs to professional ice, ${countryName}'s hockey ecosystem offers opportunities for players of all ages and skill levels. Browse the directory below to find rinks, teams, and leagues near you.`;

  return (
    <div className={styles.pageContainer}>
      <Breadcrumb items={breadcrumbItems} />

      <div className={styles.hero}>
        <h1 className={styles.heroTitle}>{countryName} Hockey</h1>
        <p className={styles.heroMeta}>{rinkCount || 0} Rinks · {teamCount || 0} Teams · {leagues?.length || 0} Leagues</p>
      </div>

      <section className={styles.introBlock}>
        <p>{intro}</p>
      </section>

      {uniqueCities.length > 0 && (
        <section className={styles.section}>
          <h2>Browse by City</h2>
          <p className={styles.sectionDesc}>Find ice rinks and hockey facilities in {countryName} cities.</p>
          <div className={styles.cardGrid}>
            {uniqueCities.map((city) => (
              <Link key={city.city} href={`/hockey/${country}/${slugify(city.city)}`} className={styles.cityCard}>
                <span className={styles.cityIcon}>🏒</span>
                <span className={styles.cityInfo}>
                  <span className={styles.cityName}>{city.city}{city.province ? `, ${city.province}` : ''}</span>
                  <span className={styles.cityCta}>Browse Rinks →</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {leagues && leagues.length > 0 && (
        <section className={styles.section}>
          <h2>Leagues in {countryName}</h2>
          <p className={styles.sectionDesc}>Organized by level — from youth to professional.</p>
          <div className={styles.linkGrid}>
            {leagues.map((league) => (
              <Link key={league.slug || league.name} href={`/leagues/${country}/${league.slug}`} className={styles.entityLink}>
                <span className={styles.entityName}>{league.name}</span>
                {league.level && <span className={styles.entityMeta}>{league.level}</span>}
              </Link>
            ))}
          </div>
        </section>
      )}

      {teams && teams.length > 0 && (
        <section className={styles.section}>
          <h2>Teams in {countryName}</h2>
          <p className={styles.sectionDesc}>Hockey teams across all leagues and levels.</p>
          <div className={styles.linkGrid}>
            {teams.map((team) => {
              const leagueSlug = team.league ? slugify(team.league) : 'other';
              return (
                <Link key={team.slug || team.name} href={`/teams/${country}/${leagueSlug}/${team.slug}`} className={styles.entityLink}>
                  <span className={styles.entityName}>{team.name}</span>
                  {team.league && <span className={styles.entityMeta}>{team.league}</span>}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section className={styles.ctaBlock}>
        <h2>Explore the Full Directory</h2>
        <p>Browse all rinks, teams, and leagues in the complete hockey directory.</p>
        <div className={styles.ctaBtns}>
          <Link href="/directory/rinks" className={styles.btnPrimary}>All Rinks</Link>
          <Link href="/directory/teams" className={styles.btnSecondary}>All Teams</Link>
          <Link href="/directory/leagues" className={styles.btnSecondary}>All Leagues</Link>
        </div>
      </section>
    </div>
  );
}
