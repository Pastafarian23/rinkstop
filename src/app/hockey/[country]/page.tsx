import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import Breadcrumb from '@/components/Breadcrumb';
import { Metadata } from 'next';
import styles from './country.module.css';

interface Props {
  params: Promise<{ country: string }>;
}

function formatCountryName(slug: string): string {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function slugify(str: string): string {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

// Country-specific hockey context data
const COUNTRY_HOCKEY_DATA: Record<string, {
  overview: string;
  highlights: string[];
  playerDev: string;
  notableLeagues: string[];
  youthGrowth: string;
}> = {
  'united-states': {
    overview: 'The United States has one of the most vibrant hockey cultures in the world, with over 1 million registered players across youth, college, and professional levels. From NHL arenas to outdoor ponds, hockey is woven into the fabric of northern communities.',
    highlights: ['NHL leads global professional attendance', 'Top youth hockey development system globally', '300+ college hockey programs (NCAA, ACHA, club)', 'Outdoor hockey tradition from pond hockey to NHL Stadium Series'],
    playerDev: 'The US follows a comprehensive player development pathway: Youth hockey → High School → USHL/Junior → NCAA College Hockey → NHL. The American Development Model (ADM) emphasizes age-appropriate skill development.',
    notableLeagues: ['NHL', 'AHL', 'ECHL', 'NCAA Division I', 'USHL', 'NAHL', 'High School hockey'],
    youthGrowth: 'Youth hockey has grown substantially, with Learn to Play programs introducing thousands of new players each year. Girls hockey participation has particularly surged with the growth of the PWHL.'
  },
  'canada': {
    overview: 'Canada is the spiritual home of hockey, with the sport deeply embedded in national identity. Every Canadian province and major city has a rich hockey heritage, producing legendary players and hosting world-class competitions.',
    highlights: ['Home to the original six NHL teams and the Montreal Canadiens', 'World-leading minor hockey infrastructure', 'Canadian players dominate international competition', 'Strong women\'s hockey program with PWHL'],
    playerDev: 'Canadian players develop through minor hockey (ages 4-18), junior leagues (OJHL, WHL, QMJHL, BCHL), and university/college (U Sports). The Canadian Hockey League (CHL) is the premier junior development circuit.',
    notableLeagues: ['NHL', 'AHL', 'ECHL', 'CHL (WHL, OHL, QMJHL)', 'NCAA Canadian players', 'U Sports hockey', 'PWHL'],
    youthGrowth: 'Canadian minor hockey association enrollment exceeds 500,000 players. Hockey Canada and provincial branches provide structured development from Initiation to Junior levels.'
  },
  'sweden': {
    overview: 'Sweden is a hockey superpower, consistently producing top NHL talent and competing for international medals. Swedish hockey combines technical skill development with a strong team-first philosophy.',
    highlights: ['One of the top development countries globally', 'SHL (Swedish Hockey League) is a top-5 league worldwide', 'Pioneered modern youth development techniques', 'Home to legendary arenas like Avantly and Globen'],
    playerDev: 'Swedish players progress through club youth systems (Frölunda, Färjestad, Rögle) from childhood through professional ranks. Many Swedish players come to North America via the NHL\'s European scouting network.',
    notableLeagues: ['SHL (Swedish Hockey League)', 'Allsvenskan (2nd tier)', 'HockeyAllsvenskan', 'SDHL (women)', 'J20 Junior League'],
    youthGrowth: 'Sweden\'s youth hockey system is structured around club-based development with emphasis on skill and creativity over physicality at early ages.'
  },
  'finland': {
    overview: 'Finland punches well above its weight in global hockey, producing a disproportionate number of NHL players relative to population. Finnish hockey emphasizes intelligence, positioning, and technical excellence.',
    highlights: ['Per capita, produces more NHL players than any other country', 'Known as "The Finnish Hockey School" development model', 'Multiple World Championship medals this century', 'Strong goaltending tradition (Rinne, Markström)'],
    playerDev: 'Finnish players train in club systems (JYP, Ilves, TPS, HIFK) with structured practices. The Finnish Hockey School model focuses on broad athletic development before specializing in hockey.',
    notableLeagues: ['Liiga (SM-liiga)', 'Mestis (2nd tier)', 'U20 and U18 junior leagues', 'Naisten Liiga (women)'],
    youthGrowth: 'Finland\'s systematic approach to youth development, including the Hockey School curriculum, has become a model for global player development.'
  },
  'germany': {
    overview: 'Germany has emerged as a hockey powerhouse in recent decades, with strong club infrastructure and rapidly growing youth participation. The DEL (Deutsche Eishockey Liga) has established itself as a top European league.',
    highlights: ['Germany\'s men\'s team won Olympic silver (2018) and gold (2018)', 'DEL is Europe\'s most-attended hockey league', 'Growing women's hockey program', 'Strong youth development academy system'],
    playerDev: 'German players develop through DEL academy clubs with structured youth programs. The NHL\'s European scouting has increased visibility of German talent, with players like Leon Draisaitl becoming stars.',
    notableLeagues: ['DEL (Deutsche Eishockey Liga)', 'DEL2 (2nd tier)', 'Oberliga', 'German women\'s league'],
    youthGrowth: 'Youth hockey participation in Germany has grown consistently, driven by national team success and increased facility development across the country.'
  },
  'russia': {
    overview: 'Russia (and formerly the Soviet Union) has a legendary hockey heritage, producing some of the most technically skilled and creative players in hockey history. Russian hockey combines European systems with a distinct creative style.',
    highlights: ['Most Olympic gold medals in hockey (8)', 'World Championship powerhouse', 'KHL is one of the world\'s top leagues', 'Produced greats like Ovechkin, Malkin, Fedorov'],
    playerDev: 'Russian players develop through sports school systems (Detsko-Yunost sports schools) with many progressing to the KHL, junior leagues, or NHL. CSKA Moscow and SKA St. Petersburg are legendary development clubs.',
    notableLeagues: ['KHL (Kontinental Hockey League)', 'VHL (2nd tier)', 'MHL (junior)', 'KHL Women'],
    youthGrowth: 'Russia has extensive youth hockey infrastructure with regional sports schools and the KHL\'s investment in junior development.'
  },
  'czech-republic': {
    overview: 'The Czech Republic has a rich hockey tradition as one of Europe\'s hockey powers. Czech hockey emphasizes technical skill, creative playmaking, and strong goaltending. The nation has produced NHL stars like Jaromir Jagr and Dominik Hasek.',
    highlights: ['Three Olympic medals (gold 1998)', 'Multiple World Championship medals', 'Strong goaltending tradition', 'Home to Sparta Prague and other historic clubs'],
    playerDev: 'Czech players develop through club youth systems (Sparta Prague, Kometa Brno, Litvinov) with structured development. The Extraliga is a competitive top-tier league that develops players for NHL and European leagues.',
    notableLeagues: ['Czech Extraliga', '1st Liga (2nd tier)', '2nd Liga (3rd tier)', 'Czech women\'s league'],
    youthGrowth: 'Czech youth hockey remains strong with club development systems and school hockey programs feeding the professional ranks.'
  }
};

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

export default async function CountryPage({ params }: Props) {
  const { country } = await params;
  const countryName = formatCountryName(country);
  const countryData = COUNTRY_HOCKEY_DATA[countryName] || null;

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

  // Get most recent update timestamp for freshness signal
  const { data: latestUpdate } = await supabaseAdmin
    .from('teams')
    .select('updated_at')
    .eq('country', countryName)
    .not('updated_at', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(1);

  const uniqueCities = cityRows
    ? Array.from(new Map((cityRows as any[]).map((c: any) => [c.city, c])).values()) as { city: string; province: string | null }[]
    : [];

  const breadcrumbItems = [
    { label: 'Hockey', href: '/search' },
    { label: countryName },
  ];

  // Build contextual intro
  const contextualIntro = countryData 
    ? `${countryName} is home to a growing hockey community spanning ${uniqueCities.length} cit${uniqueCities.length === 1 ? 'y' : 'ies'}, ${leagues?.length || 0} leagues, and ${rinkCount || 0} registered rinks. From youth programs to professional ice, ${countryName}'s hockey ecosystem offers opportunities for players of all ages and skill levels. ${countryData.overview}`
    : `${countryName} is home to a growing hockey community spanning ${uniqueCities.length} cit${uniqueCities.length === 1 ? 'y' : 'ies'}, ${leagues?.length || 0} leagues, and ${rinkCount || 0} registered rinks. From youth programs to professional ice, ${countryName}'s hockey ecosystem offers opportunities for players of all ages and skill levels.`;

  return (
    <div className={styles.pageContainer}>
      <Breadcrumb items={breadcrumbItems} />

      <div className={styles.hero}>
        <h1 className={styles.heroTitle}>{countryName} Hockey</h1>
        <p className={styles.heroMeta}>{rinkCount || 0} Rinks · {teamCount || 0} Teams · {leagues?.length || 0} Leagues</p>
      </div>

      {/* Enhanced intro with contextual content */}
      <section className={styles.introBlock}>
        <p>{contextualIntro}</p>
        
        {/* Contextual highlights for known countries */}
        {countryData && countryData.highlights.length > 0 && (
          <div style={{ marginTop: '1.25rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#C8102E', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Key Facts</h3>
            <ul style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.5rem', listStyle: 'none', padding: 0, margin: 0 }}>
              {countryData.highlights.map((fact, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', lineHeight: 1.5 }}>
                  <span style={{ color: '#C8102E', flexShrink: 0 }}>✓</span>
                  <span dangerouslySetInnerHTML={{ __html: fact }} />
                </li>
              ))}
            </ul>
          </div>
        )}
        
        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link href={`/learn`} style={{ fontSize: '0.8125rem', color: '#C8102E', fontWeight: 600 }}>Learn Hockey →</Link>
          <Link href={`/directory/youth-hockey`} style={{ fontSize: '0.8125rem', color: '#C8102E', fontWeight: 600 }}>Youth Hockey →</Link>
          {countryData && countryData.notableLeagues[0] && (
            <Link href={`/directory/leagues`} style={{ fontSize: '0.8125rem', color: '#C8102E', fontWeight: 600 }}>Find Leagues →</Link>
          )}
        </div>
      </section>

      {/* Contextual links to related content */}
      {countryData && (
        <section className={styles.section}>
          <h2>Development & Youth Hockey in {countryName}</h2>
          <p className={styles.sectionDesc}>{countryData.playerDev}</p>
          
          {/* Notable leagues in context */}
          {countryData.notableLeagues.length > 0 && (
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
              {countryData.notableLeagues.slice(0, 5).map(league => (
                <span key={league} style={{ background: 'rgba(200,16,46,0.15)', color: '#C8102E', padding: '0.375rem 0.75rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                  {league}
                </span>
              ))}
            </div>
          )}
          
          <p style={{ marginTop: '1rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', lineHeight: 1.6 }}>
            {countryData.youthGrowth}
          </p>
          
          <Link href={`/directory/youth-hockey`} style={{ display: 'inline-block', marginTop: '1rem', padding: '0.5rem 1rem', background: '#C8102E', color: '#fff', borderRadius: '4px', fontWeight: 600, fontSize: '0.8125rem', textDecoration: 'none' }}>
            Explore Youth & Adult Hockey Programs →
          </Link>
        </section>
      )}

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
          
          {/* Contextual inline link to best rinks page */}
          <div style={{ marginTop: '1rem', padding: '0.875rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)' }}>
            Looking for the best rinks in a specific city? <Link href="/best-ice-rinks" style={{ color: '#C8102E', fontWeight: 600 }}>Browse best-of rankings →</Link>
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
          
          {/* Contextual league link */}
          <div style={{ marginTop: '0.75rem', fontSize: '0.8125rem', color: 'rgba(255,255,255,0.4)' }}>
            See also: <Link href="/directory/pro-leagues" style={{ color: '#C8102E' }}>All Professional Leagues</Link>
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
          
          {/* Contextual team links */}
          <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1rem', fontSize: '0.8125rem', color: 'rgba(255,255,255,0.4)' }}>
            <Link href="/directory/teams" style={{ color: '#C8102E' }}>Browse All Teams →</Link>
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