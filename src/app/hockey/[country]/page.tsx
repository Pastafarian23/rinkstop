import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import Breadcrumb from '@/components/Breadcrumb';
import { Metadata } from 'next';

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
    <div className="page-container">
      <Breadcrumb items={breadcrumbItems} />

      <div className="hero">
        <h1 className="hero-title">{countryName} Hockey</h1>
        <p className="hero-meta">{rinkCount || 0} Rinks · {teamCount || 0} Teams · {leagues?.length || 0} Leagues</p>
      </div>

      <section className="intro-block">
        <p>{intro}</p>
      </section>

      {uniqueCities.length > 0 && (
        <section className="section">
          <h2>Browse by City</h2>
          <p className="section-desc">Find ice rinks and hockey facilities in {countryName} cities.</p>
          <div className="card-grid">
            {uniqueCities.map((city) => (
              <Link key={city.city} href={`/hockey/${country}/${slugify(city.city)}`} className="city-card">
                <span className="city-icon">🏒</span>
                <span className="city-info">
                  <span className="city-name">{city.city}{city.province ? `, ${city.province}` : ''}</span>
                  <span className="city-cta">Browse Rinks →</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {leagues && leagues.length > 0 && (
        <section className="section">
          <h2>Leagues in {countryName}</h2>
          <p className="section-desc">Organized by level — from youth to professional.</p>
          <div className="link-grid">
            {leagues.map((league) => (
              <Link key={league.slug || league.name} href={`/leagues/${country}/${league.slug}`} className="entity-link">
                <span className="entity-name">{league.name}</span>
                {league.level && <span className="entity-meta">{league.level}</span>}
              </Link>
            ))}
          </div>
        </section>
      )}

      {teams && teams.length > 0 && (
        <section className="section">
          <h2>Teams in {countryName}</h2>
          <p className="section-desc">Hockey teams across all leagues and levels.</p>
          <div className="link-grid">
            {teams.map((team) => {
              const leagueSlug = team.league ? slugify(team.league) : 'other';
              return (
                <Link key={team.slug || team.name} href={`/teams/${country}/${leagueSlug}/${team.slug}`} className="entity-link">
                  <span className="entity-name">{team.name}</span>
                  {team.league && <span className="entity-meta">{team.league}</span>}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section className="cta-block">
        <h2>Explore the Full Directory</h2>
        <p>Browse all rinks, teams, and leagues in the complete hockey directory.</p>
        <div className="cta-btns">
          <Link href="/directory/rinks" className="btn-primary">All Rinks</Link>
          <Link href="/directory/teams" className="btn-secondary">All Teams</Link>
          <Link href="/directory/leagues" className="btn-secondary">All Leagues</Link>
        </div>
      </section>

      <style jsx>{`
        .page-container { max-width: 1100px; margin: 0 auto; padding: 2rem 1.5rem; }
        .hero { text-align: center; padding: 2.5rem 0 1.5rem; }
        .hero-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: clamp(2.5rem, 6vw, 3.75rem);
          color: #041e42;
          letter-spacing: 0.03em;
          margin: 0 0 0.5rem;
          line-height: 1;
        }
        .hero-meta { color: #666; font-size: 1rem; margin: 0; }
        .intro-block {
          max-width: 700px;
          margin: 0 auto 2.5rem;
          padding: 1.25rem 1.5rem;
          background: #fff;
          border-left: 4px solid #c8102e;
          border-radius: 0 8px 8px 0;
          box-shadow: 0 2px 12px rgba(4,30,66,0.06);
        }
        .intro-block p { margin: 0; font-size: 1.05rem; line-height: 1.7; color: #333; }
        .section { margin-bottom: 3rem; }
        .section h2 {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 1.75rem;
          color: #041e42;
          letter-spacing: 0.03em;
          margin: 0 0 0.25rem;
        }
        .section-desc { color: #666; margin: 0 0 1.25rem; font-size: 0.95rem; }
        .card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.75rem; }
        .city-card {
          display: flex; align-items: center; gap: 0.75rem;
          padding: 1rem 1.25rem;
          background: #fff; border: 1.5px solid #e2e8f0;
          border-radius: 8px; text-decoration: none;
          transition: all 0.2s;
        }
        .city-card:hover { border-color: #c8102e; box-shadow: 0 4px 16px rgba(200,16,46,0.1); transform: translateY(-1px); }
        .city-icon { font-size: 1.6rem; flex-shrink: 0; }
        .city-info { display: flex; flex-direction: column; }
        .city-name { font-weight: 700; font-size: 1rem; color: #041e42; }
        .city-cta { font-size: 0.8rem; color: #c8102e; font-weight: 600; }
        .link-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 0.5rem; }
        .entity-link {
          display: flex; flex-direction: column;
          padding: 0.75rem 1rem;
          background: #fff; border: 1px solid #e2e8f0;
          border-radius: 6px; text-decoration: none;
          transition: all 0.2s;
        }
        .entity-link:hover { border-color: #041e42; background: #041e42; }
        .entity-link:hover .entity-name { color: #fff; }
        .entity-link:hover .entity-meta { color: #ffb81c; }
        .entity-name { font-weight: 600; font-size: 0.95rem; color: #041e42; }
        .entity-meta { font-size: 0.78rem; color: #888; margin-top: 0.15rem; }
        .cta-block {
          text-align: center; padding: 2.5rem 2rem;
          background: linear-gradient(135deg, #041e42 0%, #0d2d5a 100%);
          border-radius: 12px; color: #fff; margin-top: 2rem;
        }
        .cta-block h2 {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 1.8rem; color: #fff; margin: 0 0 0.5rem; letter-spacing: 0.03em;
        }
        .cta-block p { color: rgba(255,255,255,0.7); margin: 0 0 1.5rem; }
        .cta-btns { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }
        .btn-primary {
          padding: 0.75rem 2rem; background: #c8102e; color: #fff;
          border-radius: 6px; text-decoration: none; font-weight: 700; transition: background 0.2s;
        }
        .btn-primary:hover { background: #a00d24; }
        .btn-secondary {
          padding: 0.75rem 1.5rem; background: transparent;
          border: 1.5px solid rgba(255,255,255,0.4); color: #fff;
          border-radius: 6px; text-decoration: none; font-weight: 600; transition: all 0.2s;
        }
        .btn-secondary:hover { border-color: #ffb81c; color: #ffb81c; }
      `}</style>
    </div>
  );
}
