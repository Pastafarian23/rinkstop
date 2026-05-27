import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import Breadcrumb from '@/components/Breadcrumb';
import { Metadata } from 'next';
import styles from './rink.module.css';

interface Props {
  params: Promise<{ country: string; city: string; rink: string }>;
}

function formatName(slug: string): string {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function slugify(str: string): string {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { country, city, rink } = await params;
  const rinkName = formatName(rink);
  const cityName = formatName(city);
  const countryName = formatName(country);
  return {
    title: `${rinkName} — Ice Rink in ${cityName}, ${countryName} | RinkStop`,
    description: `${rinkName} in ${cityName}, ${countryName}. Find upcoming hockey games, leagues, public skate times, and team schedules at this venue.`,
    openGraph: {
      title: `${rinkName} | RinkStop`,
      description: `Hockey at ${rinkName} in ${cityName}, ${countryName}.`,
      type: 'website',
    },
  };
}

export default async function RinkDetailPage({ params }: Props) {
  const { country, city, rink } = await params;
  const rinkName = formatName(rink);
  const cityName = formatName(city);
  const countryName = formatName(country);

  // Find rink by slug
  const { data: rinkData } = await supabaseAdmin
    .from('rinks')
    .select('id, name, slug, address, city, province, country, phone, website, description')
    .eq('slug', rink)
    .single();

  if (!rinkData) notFound();

  // Get upcoming games at this rink
  const { data: games } = await supabaseAdmin
    .from('games')
    .select('id, date, time, home_team_name, away_team_name, status, home_score, away_score')
    .eq('venue_id', rinkData.id)
    .gte('date', new Date().toISOString().split('T')[0])
    .order('date', { ascending: true })
    .limit(10);

  // Get teams that call this rink home
  const { data: homeTeams } = await supabaseAdmin
    .from('teams')
    .select('name, slug, league')
    .eq('home_rink_id', rinkData.id)
    .not('slug', 'is', null)
    .order('name');

  // Get nearby rinks in same city
  const { data: nearbyRinks } = await supabaseAdmin
    .from('rinks')
    .select('name, slug, city')
    .eq('country', countryName)
    .ilike('city', cityName)
    .not('slug', 'is', null)
    .neq('slug', rink)
    .limit(5)
    .order('name');

  const breadcrumbItems = [
    { label: 'Hockey', href: '/search' },
    { label: countryName, href: `/hockey/${country}` },
    { label: cityName, href: `/hockey/${country}/${slugify(cityName)}` },
    { label: rinkName },
  ];

  return (
    <div className={styles.pageContainer}>
      <Breadcrumb items={breadcrumbItems} />

      <div className={styles.hero}>
        <div className={styles.heroBadge}>Ice Rink</div>
        <h1 className={styles.heroTitle}>{rinkData.name}</h1>
        <p className={styles.heroLocation}>{rinkData.city}{rinkData.province ? `, ${rinkData.province}` : ''}, {rinkData.country}</p>
      </div>

      {rinkData.description && (
        <section className={styles.introBlock}>
          <p>{rinkData.description}</p>
        </section>
      )}

      <div className={styles.infoGrid}>
        {rinkData.address && (
          <div className={styles.infoCard}>
            <span className={styles.infoIcon}>📍</span>
            <div>
              <div className={styles.infoLabel}>Address</div>
              <div className={styles.infoValue}>{rinkData.address}</div>
            </div>
          </div>
        )}
        {rinkData.phone && (
          <div className={styles.infoCard}>
            <span className={styles.infoIcon}>📞</span>
            <div>
              <div className={styles.infoLabel}>Phone</div>
              <div className={styles.infoValue}>{rinkData.phone}</div>
            </div>
          </div>
        )}
        {rinkData.website && (
          <div className={styles.infoCard}>
            <span className={styles.infoIcon}>🌐</span>
            <div>
              <div className={styles.infoLabel}>Website</div>
              <a href={rinkData.website} target="_blank" rel="noopener noreferrer" className={styles.infoLink}>{rinkData.website}</a>
            </div>
          </div>
        )}
      </div>

      {/* Games at this rink */}
      {games && games.length > 0 && (
        <section className={styles.section}>
          <h2>Upcoming Games at {rinkData.name}</h2>
          <div className={styles.gamesList}>
            {games.map((game) => (
              <div key={game.id} className={styles.gameCard}>
                <div className={styles.gameDate}>
                  <span className={styles.gameMonth}>{new Date(game.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })}</span>
                  <span className={styles.gameDay}>{new Date(game.date + 'T00:00:00').getDate()}</span>
                </div>
                <div className={styles.gameInfo}>
                  <div className={styles.gameTeams}>
                    <span className={styles.teamName}>{game.away_team_name}</span>
                    <span className={styles.score}>{game.home_score ?? '-'} – {game.away_score ?? '-'}</span>
                    <span className={styles.teamName}>{game.home_team_name}</span>
                  </div>
                  <div className={styles.gameStatus}>
                    {game.status === 'completed' ? 'Final' : game.time || 'TBA'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Home teams */}
      {homeTeams && homeTeams.length > 0 && (
        <section className={styles.section}>
          <h2>Teams Based at {rinkData.name}</h2>
          <p className={styles.sectionDesc}>These teams call this rink their home arena.</p>
          <div className={styles.linkGrid}>
            {homeTeams.map((team) => {
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

      {/* Nearby rinks */}
      {nearbyRinks && nearbyRinks.length > 0 && (
        <section className={styles.section}>
          <h2>More Rinks in {cityName}</h2>
          <p className={styles.sectionDesc}>Other ice facilities in the same city.</p>
          <div className={styles.linkGrid}>
            {nearbyRinks.map((nearby) => (
              <Link key={nearby.slug || nearby.name} href={`/rinks/${country}/${slugify(cityName)}/${nearby.slug}`} className={styles.entityLink}>
                <span className={styles.entityName}>{nearby.name}</span>
                <span className={styles.entityMeta}>View Rink →</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Internal links footer */}
      <section className={styles.linkFooter}>
        <Link href={`/hockey/${country}/${slugify(cityName)}`} className={styles.footerLink}>← Back to {cityName}</Link>
        <Link href={`/hockey/${country}`} className={styles.footerLink}>All {countryName} Hockey</Link>
        <Link href="/directory/rinks" className={styles.footerLink}>All Rinks</Link>
      </section>
    </div>
  );
}
