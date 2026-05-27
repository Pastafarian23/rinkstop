import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import Breadcrumb from '@/components/Breadcrumb';
import { Metadata } from 'next';
import styles from './city.module.css';

interface Props {
  params: Promise<{ country: string; city: string }>;
}

function formatName(slug: string): string {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function slugify(str: string): string {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { country, city } = await params;
  const cityName = formatName(city);
  const countryName = formatName(country);
  return {
    title: `Ice Hockey Rinks in ${cityName}, ${countryName} | RinkStop`,
    description: `Find ice rinks, hockey facilities, and skating venues in ${cityName}, ${countryName}. Browse public skate times, leagues, and teams at rinks near you.`,
    openGraph: {
      title: `Hockey in ${cityName}, ${countryName} | RinkStop`,
      description: `Ice rinks and hockey teams in ${cityName}. Find venues, schedules, and more.`,
      type: 'website',
    },
  };
}

export default async function CityPage({ params }: Props) {
  const { country, city } = await params;
  const cityName = formatName(city);
  const countryName = formatName(country);

  // Get rinks in this city
  const { data: rinks } = await supabaseAdmin
    .from('rinks')
    .select('id, name, slug, address, city, province')
    .eq('country', countryName)
    .ilike('city', cityName)
    .not('slug', 'is', null)
    .order('name');

  // Get teams in this city
  const { data: teams } = await supabaseAdmin
    .from('teams')
    .select('name, slug, league, home_rink_id')
    .eq('country', countryName)
    .not('slug', 'is', null)
    .limit(20)
    .order('name');

  const breadcrumbItems = [
    { label: 'Hockey', href: '/search' },
    { label: countryName, href: `/hockey/${country}` },
    { label: cityName },
  ];

  const intro = `${cityName}, ${countryName} is home to ${rinks?.length || 0} registered ice rink${rinks?.length !== 1 ? 's' : ''} and a vibrant local hockey community. Whether you're looking for public open skate, joining a league, or catching a local team in action, ${cityName} has options for every hockey fan. Browse the directory below to find the right rink or team for you.`;

  return (
    <div className={styles.pageContainer}>
      <Breadcrumb items={breadcrumbItems} />

      <div className={styles.hero}>
        <h1 className={styles.heroTitle}>Hockey in {cityName}</h1>
        <p className={styles.heroMeta}>{rinks?.length || 0} Rinks · {teams?.length || 0} Teams</p>
      </div>

      <section className={styles.introBlock}>
        <p>{intro}</p>
      </section>

      {rinks && rinks.length > 0 && (
        <section className={styles.section}>
          <h2>Ice Rinks in {cityName}</h2>
          <p className={styles.sectionDesc}>Find hockey arenas, public skating facilities, and indoor ice in {cityName}.</p>
          <div className={styles.cardGrid}>
            {rinks.map((rink) => (
              <Link key={rink.slug || rink.name} href={`/rinks/${country}/${slugify(cityName)}/${rink.slug}`} className={styles.cityCard}>
                <span className={styles.cityIcon}>🏒</span>
                <span className={styles.cityInfo}>
                  <span className={styles.cityName}>{rink.name}</span>
                  <span className={styles.cityCta}>View Rink →</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {teams && teams.length > 0 && (
        <section className={styles.section}>
          <h2>Hockey Teams in {cityName}</h2>
          <p className={styles.sectionDesc}>Local teams based in or near {cityName}.</p>
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

      {(!rinks || rinks.length === 0) && (!teams || teams.length === 0) && (
        <section className={styles.section}>
          <p style={{ color: '#666', textAlign: 'center', padding: '2rem' }}>
            No rinks or teams listed for {cityName} yet.{' '}
            <Link href="/directory/rinks" style={{ color: '#c8102e' }}>Browse all rinks</Link> or{' '}
            <Link href="/directory/teams" style={{ color: '#c8102e' }}>all teams</Link>.
          </p>
        </section>
      )}

      <section className={styles.ctaBlock}>
        <h2>Explore More</h2>
        <p>Keep browsing the hockey directory.</p>
        <div className={styles.ctaBtns}>
          <Link href={`/hockey/${country}`} className={styles.btnSecondary}>All {countryName}</Link>
          <Link href="/directory/rinks" className={styles.btnSecondary}>All Rinks</Link>
          <Link href="/directory/teams" className={styles.btnSecondary}>All Teams</Link>
        </div>
      </section>
    </div>
  );
}
