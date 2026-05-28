import type { Metadata } from 'next';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

// Canadian province abbreviations and full names
const CA_PROVINCES: Record<string, string> = {
  'alberta': 'AB', 'british-columbia': 'BC', 'manitoba': 'MB',
  'new-brunswick': 'NB', 'newfoundland-and-labrador': 'NL', 'nova-scotia': 'NS',
  'northwest-territories': 'NT', 'nunavut': 'NU', 'ontario': 'ON',
  'prince-edward-island': 'PE', 'quebec': 'QC', 'saskatchewan': 'SK', 'yukon': 'YT',
  'ab': 'AB', 'bc': 'BC', 'mb': 'MB',
  'nb': 'NB', 'nl': 'NL', 'ns': 'NS',
  'nt': 'NT', 'nu': 'NU', 'on': 'ON',
  'pe': 'PE', 'qc': 'QC', 'sk': 'SK', 'yt': 'YT',
};

const PROVINCE_NAMES: Record<string, string> = {
  'ab': 'Alberta', 'bc': 'British Columbia', 'mb': 'Manitoba',
  'nb': 'New Brunswick', 'nl': 'Newfoundland and Labrador', 'ns': 'Nova Scotia',
  'nt': 'Northwest Territories', 'nu': 'Nunavut', 'on': 'Ontario',
  'pe': 'Prince Edward Island', 'qc': 'Quebec', 'sk': 'Saskatchewan', 'yt': 'Yukon',
};

const PROVINCE_HOCKEY_FACTS: Record<string, { nhlTeams?: string; notableLeagues?: string; juniorLeagues?: string }> = {
  'ON': { nhlTeams: 'Toronto Maple Leafs, Ottawa Senators, Buffalo Sabres (shared with NY)', notableLeagues: 'NHL, AHL, OHL, ECHL', juniorLeagues: 'OHL (Ontario Hockey League), OHL is one of the three major junior leagues' },
  'QC': { nhlTeams: 'Montreal Canadiens', notableLeagues: 'NHL, QMJHL, NCAA', juniorLeagues: 'QMJHL (Quebec Major Junior Hockey League)' },
  'BC': { nhlTeams: 'Vancouver Canucks', notableLeagues: 'NHL, WHL, BCHL', juniorLeagues: 'WHL (Western Hockey League), BCHL (British Columbia Hockey League)' },
  'AB': { nhlTeams: 'Calgary Flames, Edmonton Oilers', notableLeagues: 'NHL, WHL, AJHL', juniorLeagues: 'WHL, AJHL (Alberta Junior Hockey League)' },
  'MB': { nhlTeams: 'Winnipeg Jets', notableLeagues: 'NHL, WHL, MJHL', juniorLeagues: 'WHL, MJHL (Manitoba Junior Hockey League)' },
};

interface ProvinceData {
  province: string;
  provinceAbbr: string;
  rink_count: number;
  team_count: number;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Canada Hockey - Ice Rinks, Teams & Leagues | RinkStop',
    description: 'Find every hockey rink, team, and league across Canada. From Ontario to British Columbia, discover youth programs, junior leagues, and NHL teams.',
    alternates: {
      canonical: 'https://rinkstop.com/directory/canada',
    },
    openGraph: {
      title: 'Canada Hockey | RinkStop',
      description: 'Hockey across Canada: ice rinks, teams, leagues, and youth programs in all provinces and territories.',
      type: 'website',
    },
  };
}

export const dynamic = 'force-dynamic';

export default async function CanadaPage() {
  // Get all rinks grouped by province
  const { data: rinks } = await supabase
    .from('rinks')
    .select('city, province_state')
    .eq('country', 'Canada')
    .eq('is_active', true)
    .not('city', 'is', null);

  // Get all teams grouped by province
  const { data: teams } = await supabase
    .from('teams')
    .select('city, province_state')
    .eq('country', 'Canada')
    .eq('is_active', true)
    .not('city', 'is', null);

  // Count rinks per province
  const rinkCounts = new Map<string, number>();
  (rinks || []).forEach(r => {
    if (r.province_state) {
      const abbr = r.province_state.toUpperCase();
      rinkCounts.set(abbr, (rinkCounts.get(abbr) || 0) + 1);
    }
  });

  // Count teams per province
  const teamCounts = new Map<string, number>();
  (teams || []).forEach(t => {
    if (t.province_state) {
      const abbr = t.province_state.toUpperCase();
      teamCounts.set(abbr, (teamCounts.get(abbr) || 0) + 1);
    }
  });

  // Build provinces list
  const provinces: ProvinceData[] = [];
  
  rinkCounts.forEach((count, abbr) => {
    const name = PROVINCE_NAMES[abbr.toLowerCase()];
    if (name) {
      provinces.push({
        province: name,
        provinceAbbr: abbr,
        rink_count: count,
        team_count: teamCounts.get(abbr) || 0,
      });
    }
  });

  teamCounts.forEach((count, abbr) => {
    if (!rinkCounts.has(abbr)) {
      const name = PROVINCE_NAMES[abbr.toLowerCase()];
      if (name) {
        provinces.push({
          province: name,
          provinceAbbr: abbr,
          rink_count: 0,
          team_count: count,
        });
      }
    }
  });

  provinces.sort((a, b) => (b.rink_count + b.team_count) - (a.rink_count + a.team_count));

  // Schema.org structured data
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://rinkstop.com' },
      { '@type': 'ListItem', position: 2, name: 'Directory', item: 'https://rinkstop.com/directory' },
      { '@type': 'ListItem', position: 3, name: 'Canada', item: 'https://rinkstop.com/directory/canada' },
    ],
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'How many NHL teams are in Canada?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Canada has 7 NHL teams: Toronto Maple Leafs, Montreal Canadiens, Vancouver Canucks, Calgary Flames, Edmonton Oilers, Ottawa Senators, and Winnipeg Jets.',
        },
      },
      {
        '@type': 'Question',
        name: 'What are the major junior hockey leagues in Canada?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Canada has three major junior hockey leagues: OHL (Ontario Hockey League), QMJHL (Quebec Major Junior Hockey League), and WHL (Western Hockey League). These feed into NCAA and NHL.',
        },
      },
      {
        '@type': 'Question',
        name: 'How many ice rinks are in Canada?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Canada has one of the highest concentrations of ice rinks per capita in the world. Ontario and Quebec have the most rinks, with the sport deeply embedded in Canadian culture.',
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1rem 4rem' }}>
        <nav style={{ fontSize: '0.75rem', color: '#555555', padding: '1.5rem 0 0', marginBottom: '0' }}>
          <Link href="/" style={{ color: '#555555' }}>Home</Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <Link href="/directory" style={{ color: '#555555' }}>Directory</Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <span style={{ color: '#A0A0A0' }}>Canada</span>
        </nav>

        <div style={{ marginBottom: '2rem', paddingTop: '1.5rem' }}>
          <div style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C8102E', marginBottom: '0.5rem' }}>
            🇨🇦 Canada
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '0.75rem' }}>
            Canada Hockey
          </h1>

          {/* Intro */}
          <p style={{ color: '#555', fontSize: '1.0625rem', lineHeight: 1.7, maxWidth: '800px', marginBottom: '1rem' }}>
            Canada is the birthplace of modern hockey with 7 NHL teams, three major junior leagues, and thousands of minor hockey associations.
            From Ontario to British Columbia, discover ice rinks, teams, and leagues across all {provinces.length} provinces and territories.
          </p>

          {/* Quick stats */}
          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem' }}>
            <div style={{ background: 'var(--s2)', padding: '0.75rem 1.25rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#C8102E' }}>{provinces.length}</div>
              <div style={{ fontSize: '0.75rem', color: '#666' }}>Provinces</div>
            </div>
            <div style={{ background: 'var(--s2)', padding: '0.75rem 1.25rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#C8102E' }}>{Array.from(rinkCounts.values()).reduce((a, b) => a + b, 0)}</div>
              <div style={{ fontSize: '0.75rem', color: '#666' }}>Rinks</div>
            </div>
            <div style={{ background: 'var(--s2)', padding: '0.75rem 1.25rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#C8102E' }}>7</div>
              <div style={{ fontSize: '0.75rem', color: '#666' }}>NHL Teams</div>
            </div>
          </div>

          <p style={{ color: '#666666', fontSize: '0.9375rem' }}>
            Browse by province below or <Link href="/add-listing" style={{ color: '#C8102E', fontWeight: 600 }}>add a listing</Link> if we&apos;re missing something.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {provinces.map(({ province, provinceAbbr, team_count, rink_count }) => {
            const provinceSlug = province.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            return (
              <Link
                key={provinceAbbr}
                href={`/directory/canada/${provinceAbbr.toLowerCase()}`}
                style={{
                  display: 'block',
                  padding: '1.25rem',
                  background: 'var(--s2)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'border-color 0.15s',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '1.0625rem', marginBottom: '0.5rem' }}>
                  {province}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#888', display: 'flex', gap: '1rem' }}>
                  {team_count > 0 && <span>🏒 {team_count} teams</span>}
                  {rink_count > 0 && <span>⛸️ {rink_count} rinks</span>}
                </div>
              </Link>
            );
          })}
        </div>

        {/* Cross-links */}
        <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--s2)', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>🏒 Explore Canadian Hockey</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>Major Junior Leagues</div>
              <Link href="/directory/junior/ohl" style={{ color: '#C8102E', fontSize: '0.875rem', display: 'block' }}>OHL (Ontario)</Link>
              <Link href="/directory/junior/qmjhl" style={{ color: '#C8102E', fontSize: '0.875rem', display: 'block' }}>QMJHL (Quebec)</Link>
              <Link href="/directory/junior/whl" style={{ color: '#C8102E', fontSize: '0.875rem', display: 'block' }}>WHL (Western)</Link>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>NHL Teams</div>
              <Link href="/directory/nhl" style={{ color: '#C8102E', fontSize: '0.875rem' }}>All NHL Teams →</Link>
            </div>
          </div>
        </div>

        {provinces.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏒</div>
            <p>No hockey found in Canada yet.</p>
            <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
              Know a team or rink? <Link href="/add-listing" style={{ color: '#C8102E' }}>Add it</Link>
            </p>
          </div>
        )}
      </div>
    </>
  );
}