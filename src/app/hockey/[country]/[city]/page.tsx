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
  const countryName = formatName(country);

  // URL decode and convert slug to city name (e.g. "new-york" → "New York")
  const rawCity = decodeURIComponent(city);
  const cityName = rawCity.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  // Get rinks in this city
  const escapedCity = cityName.replace(/[%_]/g, '\\$&');
  const { data: rinks } = await supabaseAdmin
    .from('rinks')
    .select('id, name, slug, address, city, province, phone, website, description')
    .eq('country', countryName)
    .ilike('city', `*${escapedCity}*`)
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

  // Get nearby cities for cross-linking
  const { data: nearbyCityRows } = await supabaseAdmin
    .from('rinks')
    .select('city, province')
    .eq('country', countryName)
    .not('city', 'is', null)
    .not('slug', 'is', null)
    .limit(100);

  // Get most recent update timestamp for freshness signal
  const { data: latestUpdate } = await supabaseAdmin
    .from('teams')
    .select('updated_at')
    .eq('country', countryName)
    .ilike('city', cityName)
    .not('updated_at', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(1);

  const allCities = nearbyCityRows 
    ? Array.from(new Set((nearbyCityRows as any[]).map((c: any) => c.city as string))).filter(c => c !== cityName).slice(0, 8)
    : [];

  // Get youth hockey programs
  const { data: youthPrograms } = await supabaseAdmin
    .from('youth_programs')
    .select('name, type, city')
    .eq('city', cityName)
    .limit(5);

  const breadcrumbItems = [
    { label: 'Hockey', href: '/search' },
    { label: countryName, href: `/hockey/${country}` },
    { label: cityName },
  ];

  // Build contextual intro for city hockey
  const rinkCount = rinks?.length || 0;
  const teamCount = teams?.length || 0;
  
  const contextualIntro = `${cityName}, ${countryName} is home to ${rinkCount} registered ice rink${rinkCount !== 1 ? 's' : ''} and a vibrant local hockey community. Whether you're looking for public open skate, joining a league, or catching a local team in action, ${cityName} has options for every hockey fan. Browse the directory below to find the right rink or team for you.`;

  return (
    <div className={styles.pageContainer}>
      <Breadcrumb items={breadcrumbItems} />

      <div className={styles.hero}>
        <h1 className={styles.heroTitle}>Hockey in {cityName}</h1>
        <p className={styles.heroMeta}>{rinkCount} Rinks · {teamCount} Teams</p>
      </div>

      {/* Enhanced city hockey overview */}
      <section className={styles.introBlock}>
        <p>{contextualIntro}</p>
        
        {/* Quick links to related content */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <Link href={`/learn`} style={{ fontSize: '0.8125rem', color: '#C8102E', fontWeight: 600 }}>Learn Hockey →</Link>
          <Link href={`/directory/youth-hockey/learn-to-play`} style={{ fontSize: '0.8125rem', color: '#C8102E', fontWeight: 600 }}>Beginner Programs →</Link>
          <Link href={`/best-ice-rinks/${city}`} style={{ fontSize: '0.8125rem', color: '#C8102E', fontWeight: 600 }}>Best Rinks in {cityName} →</Link>
        </div>
      </section>

      {/* Public Skate & Learn-to-Play Info */}
      <section className={styles.section}>
        <h2>Get on the Ice in {cityName}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>⛸️ Public Skate</h3>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', lineHeight: 1.5, marginBottom: '0.75rem' }}>
              Most rinks offer regular public skating sessions. Check individual rink pages for schedules and pricing.
            </p>
            <Link href="/directory/games" style={{ fontSize: '0.8125rem', color: '#C8102E', fontWeight: 600 }}>Find Open Skate Times →</Link>
          </div>
          
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>🏒 Stick & Puck</h3>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', lineHeight: 1.5, marginBottom: '0.75rem' }}>
              Open practice sessions where you can work on your skills. Equipment required; full gear recommended.
            </p>
            <Link href="/directory/games" style={{ fontSize: '0.8125rem', color: '#C8102E', fontWeight: 600 }}>View Stick & Puck Schedule →</Link>
          </div>
          
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>👶 Learn to Play</h3>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', lineHeight: 1.5, marginBottom: '0.75rem' }}>
              Structured programs for beginners of all ages. No experience required — learn the basics from qualified instructors.
            </p>
            <Link href="/directory/youth-hockey/learn-to-play" style={{ fontSize: '0.8125rem', color: '#C8102E', fontWeight: 600 }}>Find Learn to Play Near You →</Link>
          </div>
        </div>
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
                  {rink.address && <span className={styles.cityCta}>{rink.address.split(',')[0]} →</span>}
                </span>
              </Link>
            ))}
          </div>
          
          {/* Contextual link to best-of page */}
          <div style={{ marginTop: '1rem', padding: '0.875rem 1rem', background: 'rgba(200,16,46,0.1)', borderRadius: '6px' }}>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>
              <Link href={`/best-ice-rinks/${city}`} style={{ color: '#C8102E', fontWeight: 600 }}>View our ranked list of the best rinks in {cityName} →</Link>
            </span>
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
          
          {/* Contextual team links */}
          <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1rem', fontSize: '0.8125rem', color: 'rgba(255,255,255,0.4)' }}>
            <Link href="/directory/teams" style={{ color: '#C8102E' }}>Browse All Teams →</Link>
            <Link href="/directory/youth-hockey/adult-leagues" style={{ color: '#C8102E' }}>Find Adult Leagues →</Link>
          </div>
        </section>
      )}

      {/* Youth & Adult Hockey Programs */}
      {youthPrograms && youthPrograms.length > 0 && (
        <section className={styles.section}>
          <h2>Youth & Adult Hockey Programs</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {youthPrograms.map((prog: any) => (
              <div key={prog.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.875rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                <span style={{ fontWeight: 600, color: '#fff' }}>{prog.name}</span>
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.08)', padding: '0.25rem 0.625rem', borderRadius: '4px' }}>{prog.type}</span>
              </div>
            ))}
          </div>
          <Link href="/directory/youth-hockey/programs" style={{ display: 'inline-block', marginTop: '1rem', padding: '0.5rem 1rem', background: '#C8102E', color: '#fff', borderRadius: '4px', fontWeight: 600, fontSize: '0.8125rem', textDecoration: 'none' }}>
            Find Youth Hockey Programs Near You →
          </Link>
        </section>
      )}

      {/* Nearby Cities */}
      {allCities.length > 0 && (
        <section className={styles.section}>
          <h2>Explore Nearby Cities</h2>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {allCities.slice(0, 8).map((nearbyCity: string) => (
              <Link key={nearbyCity} href={`/hockey/${country}/${slugify(nearbyCity)}`} style={{ padding: '0.5rem 1rem', background: 'var(--s2)', borderRadius: '4px', color: '#fff', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.06)' }}>
                {nearbyCity}
              </Link>
            ))}
          </div>
          <div style={{ marginTop: '0.75rem', fontSize: '0.8125rem', color: 'rgba(255,255,255,0.4)' }}>
            <Link href={`/hockey/${country}`} style={{ color: '#C8102E' }}>View all {countryName} cities →</Link>
          </div>
        </section>
      )}

      {/* Bidirectional link to country page */}
      <section className={styles.section} style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
        <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem' }}>INTERNATIONAL HOCKEY CONTEXT</h3>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '0.75rem' }}>
          {cityName} is part of {countryName}'s hockey ecosystem. {rinkCount > 0 ? `With ${rinkCount} rink${rinkCount !== 1 ? 's' : ''} locally, ${countryName} offers extensive opportunities for players at every level.` : `${countryName} continues to grow its hockey infrastructure.`}
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link href={`/hockey/${country}`} style={{ fontSize: '0.8125rem', color: '#C8102E', fontWeight: 600 }}>{countryName} Hockey Overview →</Link>
          <Link href="/directory/countries" style={{ fontSize: '0.8125rem', color: '#C8102E', fontWeight: 600 }}>Browse All Countries →</Link>
        </div>
      </section>

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

      {/* Last Updated Freshness Signal */}
      <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)' }}>
          Last updated: {latestUpdate?.[0]?.updated_at
            ? new Date(latestUpdate[0].updated_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
            : new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>
    </div>
  );
}