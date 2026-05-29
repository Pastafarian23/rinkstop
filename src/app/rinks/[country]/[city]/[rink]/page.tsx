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
    .select('id, name, slug, address, city, province, country, phone, website, description, seating_capacity, amenities')
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

  // Get leagues for context
  const { data: leagues } = await supabaseAdmin
    .from('leagues')
    .select('name, slug')
    .eq('country', countryName)
    .order('name')
    .limit(10);

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

      {/* Amenities & Facilities */}
      <section className={styles.section}>
        <h2>Amenities & Facilities</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          {rinkData.seating_capacity && (
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '1.25rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🏟️</div>
              <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Seating Capacity</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>{rinkData.seating_capacity.toLocaleString()}</div>
            </div>
          )}
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⛸️</div>
            <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Ice Type</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>Olympic / NHL</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🅿️</div>
            <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Parking</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>On-Site</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🏒</div>
            <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Pro Shop</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>On-Site</div>
          </div>
        </div>
        
        {/* Contextual links to related rink pages */}
        <div style={{ marginTop: '1rem', padding: '0.875rem 1rem', background: 'rgba(200,16,46,0.08)', borderRadius: '6px', display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.8125rem' }}>
          <Link href={`/learn/hockey-equipment`} style={{ color: '#C8102E', fontWeight: 600 }}>Hockey Equipment Guide →</Link>
          <Link href={`/best-ice-rinks/${slugify(cityName)}`} style={{ color: '#C8102E', fontWeight: 600 }}>Best Rinks in {cityName} →</Link>
        </div>
      </section>

      <div className={styles.infoGrid}>
        {rinkData.address && (
          <div className={styles.infoCard}>
            <span className={styles.infoIcon}>📍</span>
            <div>
              <div className={styles.infoLabel}>Address</div>
              <div className={styles.infoValue}>{rinkData.address}</div>
              {/* Contextual link to nearby restaurants/hotels */}
              <div style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(rinkData.address + ' ' + cityName)}`} target="_blank" rel="noopener noreferrer" style={{ color: '#C8102E' }}>View on Google Maps →</a>
              </div>
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

      {/* Upcoming Activities at This Rink */}
      <section className={styles.section}>
        <h2>Upcoming Activities</h2>
        <p className={styles.sectionDesc}>Public sessions, stick & puck, and learn to play at {rinkData.name}.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          <Link href="/directory/games" style={{ display: 'block', padding: '1rem 1.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.06)', transition: 'border-color 0.15s' }}
            
            >
            <div style={{ fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>🗓️ Schedule & Games</div>
            <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)' }}>View upcoming games and events</div>
          </Link>
          <Link href="/directory/youth-hockey/learn-to-play" style={{ display: 'block', padding: '1rem 1.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.06)', transition: 'border-color 0.15s' }}
            
            >
            <div style={{ fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>👶 Learn to Play</div>
            <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)' }}>Beginner programs available</div>
          </Link>
          <Link href="/directory/games" style={{ display: 'block', padding: '1rem 1.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.06)', transition: 'border-color 0.15s' }}
            
            >
            <div style={{ fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>🏒 Stick & Puck Sessions</div>
            <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)' }}>Open practice sessions</div>
          </Link>
        </div>
      </section>

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
          
          {/* Contextual link to league pages */}
          <div style={{ marginTop: '1rem', fontSize: '0.8125rem', color: 'rgba(255,255,255,0.4)' }}>
            See games at other <Link href="/directory/games" style={{ color: '#C8102E' }}>rinks across {countryName} →</Link>
          </div>
        </section>
      )}

      {/* Home teams - bidirectional link */}
      {homeTeams && homeTeams.length > 0 && (
        <section className={styles.section}>
          <h2>Teams Based at {rinkData.name}</h2>
          <p className={styles.sectionDesc}>These teams call this rink their home arena — bidirectional rink→team links.</p>
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
          
          {/* Bidirectional link back to teams directory */}
          <div style={{ marginTop: '0.75rem', fontSize: '0.8125rem', color: 'rgba(255,255,255,0.4)' }}>
            Browse <Link href="/directory/teams" style={{ color: '#C8102E' }}>all teams in {countryName} →</Link>
          </div>
        </section>
      )}

      {/* Nearby rinks - city context */}
      {nearbyRinks && nearbyRinks.length > 0 && (
        <section className={styles.section}>
          <h2>More Rinks in {cityName}</h2>
          <p className={styles.sectionDesc}>Other ice facilities in the same city — city→rink bidirectional links.</p>
          <div className={styles.linkGrid}>
            {nearbyRinks.map((nearby) => (
              <Link key={nearby.slug || nearby.name} href={`/rinks/${country}/${slugify(cityName)}/${nearby.slug}`} className={styles.entityLink}>
                <span className={styles.entityName}>{nearby.name}</span>
                <span className={styles.entityMeta}>View Rink →</span>
              </Link>
            ))}
          </div>
          
          {/* Contextual link to city hockey page */}
          <div style={{ marginTop: '0.75rem', fontSize: '0.8125rem', color: 'rgba(255,255,255,0.4)' }}>
            <Link href={`/hockey/${country}/${slugify(cityName)}`} style={{ color: '#C8102E' }}>Explore all hockey in {cityName} →</Link>
          </div>
        </section>
      )}

      {/* Related leagues */}
      {leagues && leagues.length > 0 && (
        <section className={styles.section}>
          <h2>Related Leagues</h2>
          <p className={styles.sectionDesc}>Leagues that operate in {countryName}.</p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
            {leagues.slice(0, 8).map((league) => (
              <Link key={league.slug || league.name} href={`/leagues/${country}/${league.slug}`} style={{ padding: '0.5rem 1rem', background: 'rgba(200,16,46,0.1)', border: '1px solid rgba(200,16,46,0.2)', borderRadius: '4px', color: '#C8102E', fontSize: '0.8125rem', fontWeight: 600, textDecoration: 'none' }}>
                {league.name}
              </Link>
            ))}
          </div>
          <div style={{ marginTop: '0.75rem', fontSize: '0.8125rem', color: 'rgba(255,255,255,0.4)' }}>
            <Link href="/directory/leagues" style={{ color: '#C8102E' }}>Browse all leagues →</Link>
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